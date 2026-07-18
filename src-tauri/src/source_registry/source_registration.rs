use std::fs;

use crate::error::UserFacingError;
use crate::models::SourceFile;
use crate::pdf::{count_pages_with_password, is_password_required_error};
use crate::vo::DocKind;

use super::registry::RegisteredSource;

pub(crate) struct RegisteredSourceEntry {
    source: SourceFile,
    registered: RegisteredSource,
}

impl RegisteredSourceEntry {
    pub(crate) fn source_id(&self) -> &str {
        &self.source.id
    }

    pub(crate) fn registered(&self) -> &RegisteredSource {
        &self.registered
    }

    pub(crate) fn into_source(self) -> SourceFile {
        self.source
    }

    pub(crate) fn into_parts(self) -> (SourceFile, RegisteredSource) {
        (self.source, self.registered)
    }
}

pub(super) fn source_file_name(path: &str) -> String {
    std::path::Path::new(path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

pub(super) fn source_byte_size(path: &str) -> u64 {
    fs::metadata(path).map(|meta| meta.len()).unwrap_or(0)
}

pub(super) fn registered_source_entry(
    path: String,
    name: String,
    byte_size: u64,
    page_count: u32,
    kind: DocKind,
    password: Option<String>,
) -> RegisteredSourceEntry {
    let id = uuid::Uuid::new_v4().to_string();

    let source = SourceFile {
        id: id.clone(),
        original_path: path.clone(),
        name: name.clone(),
        byte_size,
        page_count: Some(page_count),
        kind,
    };
    let registered = RegisteredSource {
        original_path: path,
        kind,
        password,
    };

    RegisteredSourceEntry { source, registered }
}

fn unlock_error(error: anyhow::Error) -> anyhow::Error {
    if is_password_required_error(&error) {
        anyhow::Error::new(UserFacingError::new("invalid_pdf_password"))
    } else {
        anyhow::Error::new(UserFacingError::new("open_pdf_failed"))
    }
}

pub(crate) fn unlocked_pdf_source(
    path: String,
    password: String,
) -> anyhow::Result<RegisteredSourceEntry> {
    let name = source_file_name(&path);
    let byte_size = source_byte_size(&path);
    let page_count = count_pages_with_password(&path, Some(&password)).map_err(unlock_error)?;

    Ok(registered_source_entry(
        path,
        name,
        byte_size,
        page_count,
        DocKind::Pdf,
        Some(password),
    ))
}
