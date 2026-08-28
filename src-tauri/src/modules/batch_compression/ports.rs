use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum OutputCommitMode {
    CreateNew,
    ReplaceOwned,
}

pub(crate) trait BatchFileSystem: Send + Sync {
    fn is_directory(&self, path: &Path) -> bool;
    fn exists(&self, path: &Path) -> bool;
    fn read_limited(&self, path: &Path, max_bytes: u64) -> anyhow::Result<Vec<u8>>;
    fn commit(&self, path: &Path, bytes: &[u8], mode: OutputCommitMode) -> anyhow::Result<()>;
    fn remove_owned(&self, path: &Path) -> anyhow::Result<()>;
}
