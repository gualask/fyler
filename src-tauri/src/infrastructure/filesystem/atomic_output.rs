use std::fs::{self, File, OpenOptions};
use std::path::{Path, PathBuf};

/// Writes a destination through a sibling temporary file and replaces it only after success.
///
/// A failed writer removes the temporary file and leaves any existing destination untouched. The
/// sibling name is unique and opened with `create_new`, so concurrent exports cannot share a
/// partially written file.
pub(crate) fn write_atomically<F>(output_path: &str, write: F) -> anyhow::Result<()>
where
    F: FnOnce(&mut File) -> anyhow::Result<()>,
{
    let destination = Path::new(output_path);
    if let Some(parent) = destination
        .parent()
        .filter(|parent| !parent.as_os_str().is_empty())
    {
        fs::create_dir_all(parent)?;
    }

    let temporary = temporary_sibling(destination);
    let result = (|| {
        let mut file = OpenOptions::new()
            .write(true)
            .create_new(true)
            .open(&temporary)?;
        write(&mut file)?;
        file.sync_all()?;
        drop(file);
        replace_file(&temporary, destination)
    })();

    if result.is_err() {
        let _ = fs::remove_file(&temporary);
    }
    result
}

fn temporary_sibling(destination: &Path) -> PathBuf {
    let file_name = destination
        .file_name()
        .and_then(|name| name.to_str())
        .unwrap_or("output");
    let suffix = uuid::Uuid::new_v4();
    destination.with_file_name(format!(".{file_name}.{suffix}.tmp"))
}

fn replace_file(temporary: &Path, destination: &Path) -> anyhow::Result<()> {
    #[cfg(windows)]
    if destination.exists() {
        fs::remove_file(destination)?;
    }

    fs::rename(temporary, destination).map_err(anyhow::Error::from)
}

#[cfg(test)]
mod tests {
    use std::fs;

    use super::write_atomically;

    fn test_path(label: &str) -> String {
        std::env::temp_dir()
            .join(format!(
                "fyler-atomic-output-{label}-{}.txt",
                uuid::Uuid::new_v4()
            ))
            .to_string_lossy()
            .to_string()
    }

    #[test]
    fn failed_write_preserves_existing_destination() {
        let path = test_path("failure");
        fs::write(&path, b"old").expect("create existing destination");

        let result = write_atomically(&path, |file| {
            use std::io::Write;
            file.write_all(b"new")?;
            anyhow::bail!("simulated serialization failure");
        });

        assert!(result.is_err());
        assert_eq!(fs::read(&path).expect("read destination"), b"old");
        let _ = fs::remove_file(path);
    }

    #[test]
    fn successful_write_replaces_destination_after_close() {
        let path = test_path("success");
        fs::write(&path, b"old").expect("create existing destination");

        write_atomically(&path, |file| {
            use std::io::Write;
            file.write_all(b"new")?;
            Ok(())
        })
        .expect("atomic write");

        assert_eq!(fs::read(&path).expect("read destination"), b"new");
        let _ = fs::remove_file(path);
    }
}
