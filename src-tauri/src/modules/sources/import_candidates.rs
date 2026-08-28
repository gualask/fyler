use crate::capabilities::pdf::metadata::{count_pages, is_password_required_error};

use super::contracts::{
    DocKind, PasswordProtectedFile, SkippedFile, SkippedFileReason, SourceFile,
};
use super::ports::{ImagePreviewBytes, RegisteredSource, SourceImport, SourceRegistration};

pub(super) enum ImportCandidate {
    Ready(ReadyImport),
    PasswordRequired(PasswordProtectedFile),
}

pub(super) struct ReadyImport {
    pub(super) registration: SourceRegistration,
    pub(super) preview: Option<ImagePreviewBytes>,
}

enum CandidatePageCount {
    Available(u32),
    PasswordRequired(PasswordProtectedFile),
}

pub(super) struct ImportResults {
    pub(super) entries: Vec<ReadyImport>,
    pub(super) password_required: Vec<PasswordProtectedFile>,
    pub(super) skipped: Vec<SkippedFile>,
}

fn skipped_file(name: String, reason: SkippedFileReason, detail: Option<String>) -> SkippedFile {
    SkippedFile {
        name,
        reason,
        detail,
    }
}

fn read_error(name: &str, error: impl ToString) -> SkippedFile {
    skipped_file(
        name.to_string(),
        SkippedFileReason::ReadError,
        Some(error.to_string()),
    )
}

fn candidate_kind<R: SourceImport>(
    registry: &R,
    path: &str,
    name: &str,
) -> Result<DocKind, SkippedFile> {
    registry
        .detect_kind_from_ext(path)
        .ok_or_else(|| skipped_file(name.to_string(), SkippedFileReason::UnsupportedFormat, None))
}

fn pdf_page_count_or_password(
    path: &str,
    name: &str,
    byte_size: u64,
) -> Result<CandidatePageCount, SkippedFile> {
    match count_pages(path) {
        Ok(count) => Ok(CandidatePageCount::Available(count)),
        Err(error) if is_password_required_error(&error) => Ok(
            CandidatePageCount::PasswordRequired(PasswordProtectedFile {
                original_path: path.to_string(),
                name: name.to_string(),
                byte_size,
            }),
        ),
        Err(error) => Err(read_error(name, error)),
    }
}

fn candidate_page_count(
    path: &str,
    name: &str,
    byte_size: u64,
    kind: DocKind,
) -> Result<CandidatePageCount, SkippedFile> {
    if kind == DocKind::Image {
        return Ok(CandidatePageCount::Available(1));
    }

    pdf_page_count_or_password(path, name, byte_size)
}

fn image_preview_for_candidate<R: SourceImport>(
    registry: &R,
    path: &str,
    name: &str,
    kind: DocKind,
) -> Result<Option<ImagePreviewBytes>, SkippedFile> {
    if kind != DocKind::Image {
        return Ok(None);
    }

    registry
        .make_image_preview(path)
        .map(Some)
        .map_err(|error| read_error(name, error))
}

fn registered_source_entry(
    path: String,
    name: String,
    byte_size: u64,
    page_count: u32,
    kind: DocKind,
) -> SourceRegistration {
    let id = uuid::Uuid::new_v4().to_string();
    SourceRegistration {
        source: SourceFile {
            id,
            original_path: path.clone(),
            name,
            byte_size,
            page_count: Some(page_count),
            kind,
        },
        registered: RegisteredSource {
            original_path: path,
            kind,
            password: None,
        },
    }
}

fn ready_import(
    path: String,
    name: String,
    byte_size: u64,
    page_count: u32,
    kind: DocKind,
    preview: Option<ImagePreviewBytes>,
) -> ReadyImport {
    ReadyImport {
        registration: registered_source_entry(path, name, byte_size, page_count, kind),
        preview,
    }
}

pub(super) fn registered_file_from_path<R: SourceImport>(
    registry: &R,
    path: String,
) -> Result<ImportCandidate, SkippedFile> {
    let name = registry.source_file_name(&path);
    let kind = candidate_kind(registry, &path, &name)?;
    let byte_size = registry.source_byte_size(&path);
    let page_count = match candidate_page_count(&path, &name, byte_size, kind)? {
        CandidatePageCount::Available(page_count) => page_count,
        CandidatePageCount::PasswordRequired(file) => {
            return Ok(ImportCandidate::PasswordRequired(file));
        }
    };
    let preview = image_preview_for_candidate(registry, &path, &name, kind)?;

    Ok(ImportCandidate::Ready(ready_import(
        path, name, byte_size, page_count, kind, preview,
    )))
}

pub(super) fn collect_import_results(
    results: Vec<Result<ImportCandidate, SkippedFile>>,
) -> ImportResults {
    let mut entries = Vec::new();
    let mut password_required = Vec::new();
    let mut skipped = Vec::new();

    for result in results {
        match result {
            Ok(ImportCandidate::Ready(entry)) => entries.push(entry),
            Ok(ImportCandidate::PasswordRequired(file)) => password_required.push(file),
            Err(skip) => skipped.push(skip),
        }
    }

    ImportResults {
        entries,
        password_required,
        skipped,
    }
}
