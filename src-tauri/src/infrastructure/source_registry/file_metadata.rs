use std::fs;

pub(crate) fn source_file_name(path: &str) -> String {
    std::path::Path::new(path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

pub(crate) fn source_byte_size(path: &str) -> u64 {
    fs::metadata(path).map(|meta| meta.len()).unwrap_or(0)
}
