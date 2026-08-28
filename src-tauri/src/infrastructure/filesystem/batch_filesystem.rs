use std::fs;
use std::io::Write;
use std::path::Path;

use anyhow::Context;
use tempfile::Builder;

use crate::modules::batch_compression::{BatchFileSystem, OutputCommitMode};

/// Filesystem adapter for size-limited reads and sibling-temp output commits.
#[derive(Clone, Copy, Default)]
pub(crate) struct NativeBatchFileSystem;

impl BatchFileSystem for NativeBatchFileSystem {
    fn is_directory(&self, path: &Path) -> bool {
        path.is_dir()
    }

    fn exists(&self, path: &Path) -> bool {
        path.exists()
    }

    fn read_limited(&self, path: &Path, max_bytes: u64) -> anyhow::Result<Vec<u8>> {
        let metadata = fs::metadata(path)
            .with_context(|| format!("Failed to inspect source {}", path.display()))?;
        anyhow::ensure!(metadata.is_file(), "Source is not a regular file");
        anyhow::ensure!(
            metadata.len() <= max_bytes,
            "Source exceeds the supported size limit"
        );
        fs::read(path).with_context(|| format!("Failed to read source {}", path.display()))
    }

    fn commit(&self, path: &Path, bytes: &[u8], mode: OutputCommitMode) -> anyhow::Result<()> {
        let parent = path
            .parent()
            .filter(|parent| !parent.as_os_str().is_empty())
            .context("Output path has no parent directory")?;
        anyhow::ensure!(parent.is_dir(), "Output directory does not exist");
        let name = path
            .file_name()
            .and_then(|name| name.to_str())
            .unwrap_or("output");
        let mut temporary = Builder::new()
            .prefix(&format!(".{name}."))
            .suffix(".partial")
            .tempfile_in(parent)
            .context("Failed to create sibling partial output")?;
        temporary
            .write_all(bytes)
            .context("Failed to write partial output")?;
        temporary
            .as_file()
            .sync_all()
            .context("Failed to flush partial output")?;

        match mode {
            OutputCommitMode::CreateNew => temporary
                .persist_noclobber(path)
                .map(|_| ())
                .map_err(|error| anyhow::Error::new(error.error))
                .context("Output path became occupied before commit"),
            OutputCommitMode::ReplaceOwned => temporary
                .persist(path)
                .map(|_| ())
                .map_err(|error| anyhow::Error::new(error.error))
                .context("Failed to replace session-owned output"),
        }
    }

    fn remove_owned(&self, path: &Path) -> anyhow::Result<()> {
        match fs::remove_file(path) {
            Ok(()) => Ok(()),
            Err(error) if error.kind() == std::io::ErrorKind::NotFound => Ok(()),
            Err(error) => {
                Err(error).with_context(|| format!("Failed to remove output {}", path.display()))
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::*;

    #[test]
    fn first_commit_never_clobbers_an_existing_file() {
        let directory = tempfile::tempdir().unwrap();
        let output = directory.path().join("output.bin");
        fs::write(&output, b"existing").unwrap();

        let result = NativeBatchFileSystem.commit(&output, b"new", OutputCommitMode::CreateNew);

        assert!(result.is_err());
        assert_eq!(fs::read(&output).unwrap(), b"existing");
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    }

    #[test]
    fn authorized_replacement_commits_complete_bytes() {
        let directory = tempfile::tempdir().unwrap();
        let output = directory.path().join("output.bin");
        fs::write(&output, b"existing").unwrap();

        NativeBatchFileSystem
            .commit(&output, b"replacement", OutputCommitMode::ReplaceOwned)
            .unwrap();

        assert_eq!(fs::read(&output).unwrap(), b"replacement");
        assert_eq!(fs::read_dir(directory.path()).unwrap().count(), 1);
    }
}
