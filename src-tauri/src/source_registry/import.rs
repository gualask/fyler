use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::OnceLock;

use rayon::prelude::*;
use rayon::ThreadPoolBuilder;

use crate::models::{PasswordProtectedFile, SkippedFile, SkippedFileReason, SourceFile};
use crate::pdf::{count_pages, detect_kind_from_ext, is_password_required_error};
use crate::vo::DocKind;

use super::preview::{make_image_preview, ImagePreviewBytes};
use super::registry::SourceRegistry;
use super::source_registration::{
    registered_source_entry, source_byte_size, source_file_name, RegisteredSourceEntry,
};

/// Result of an import operation executed from filesystem paths.
pub struct FilesFromPathsResult {
    /// Successfully imported files (in no particular order).
    pub files: Vec<SourceFile>,
    /// PDFs that require a password before they can be imported.
    pub password_required: Vec<PasswordProtectedFile>,
    /// Files that were skipped, plus a reason suitable for UI messaging.
    pub skipped: Vec<SkippedFile>,
}

/// Progress for a filesystem import batch.
#[derive(Clone, Copy, Debug, Eq, PartialEq)]
pub struct ImportProgress {
    pub completed: usize,
    pub total: usize,
}

static IMPORT_POOL: OnceLock<rayon::ThreadPool> = OnceLock::new();

enum ImportCandidate {
    Ready(ReadyImport),
    PasswordRequired(PasswordProtectedFile),
}

struct ReadyImport {
    entry: RegisteredSourceEntry,
    preview: Option<ImagePreviewBytes>,
}

enum CandidatePageCount {
    Available(u32),
    PasswordRequired(PasswordProtectedFile),
}

struct ImportResults {
    entries: Vec<ReadyImport>,
    password_required: Vec<PasswordProtectedFile>,
    skipped: Vec<SkippedFile>,
}

struct ImportPathReservations {
    registry: SourceRegistry,
    paths: Vec<String>,
    finished: bool,
}

impl ImportPathReservations {
    fn new(registry: &SourceRegistry, paths: impl IntoIterator<Item = String>) -> Self {
        Self {
            registry: registry.clone(),
            paths: registry.reserve_import_paths(paths),
            finished: false,
        }
    }

    fn paths(&self) -> &[String] {
        &self.paths
    }

    fn finish(
        mut self,
        entries: Vec<(String, super::registry::RegisteredSource)>,
        previews: Vec<(String, ImagePreviewBytes)>,
        password_required_paths: &[String],
    ) {
        self.registry
            .finish_import_batch(&self.paths, entries, previews, password_required_paths);
        self.finished = true;
    }
}

impl Drop for ImportPathReservations {
    fn drop(&mut self) {
        if !self.finished {
            self.registry.cancel_import_paths(&self.paths);
        }
    }
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

fn candidate_kind(path: &str, name: &str) -> Result<DocKind, SkippedFile> {
    detect_kind_from_ext(path)
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

fn image_preview_for_candidate(
    path: &str,
    name: &str,
    kind: DocKind,
) -> Result<Option<ImagePreviewBytes>, SkippedFile> {
    if kind != DocKind::Image {
        return Ok(None);
    }

    make_image_preview(path)
        .map(Some)
        .map_err(|error| read_error(name, error))
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
        entry: registered_source_entry(path, name, byte_size, page_count, kind, None),
        preview,
    }
}

fn registered_file_from_path(path: String) -> Result<ImportCandidate, SkippedFile> {
    let name = source_file_name(&path);
    let kind = candidate_kind(&path, &name)?;
    let byte_size = source_byte_size(&path);
    let page_count = match candidate_page_count(&path, &name, byte_size, kind)? {
        CandidatePageCount::Available(page_count) => page_count,
        CandidatePageCount::PasswordRequired(file) => {
            return Ok(ImportCandidate::PasswordRequired(file));
        }
    };
    let preview = image_preview_for_candidate(&path, &name, kind)?;

    Ok(ImportCandidate::Ready(ready_import(
        path, name, byte_size, page_count, kind, preview,
    )))
}

fn import_pool() -> &'static rayon::ThreadPool {
    IMPORT_POOL.get_or_init(|| {
        // Keep a small dedicated pool to avoid oversubscribing the system during import.
        ThreadPoolBuilder::new()
            .num_threads(4)
            .thread_name(|index| format!("fyler-import-{index}"))
            .build()
            .expect("failed to build import threadpool")
    })
}

fn collect_import_results(results: Vec<Result<ImportCandidate, SkippedFile>>) -> ImportResults {
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

/// Imports sources from paths and reports each completed candidate.
///
/// The callback can run concurrently on the dedicated import pool. Every completed count is
/// reported once and includes skipped and password-protected files; consumers should tolerate
/// out-of-order delivery.
pub fn files_from_paths_with_progress<F>(
    paths: impl IntoIterator<Item = String>,
    registry: &SourceRegistry,
    on_progress: F,
) -> anyhow::Result<FilesFromPathsResult>
where
    F: Fn(ImportProgress) + Sync,
{
    let reservations = ImportPathReservations::new(registry, paths);
    let total = reservations.paths().len();
    on_progress(ImportProgress {
        completed: 0,
        total,
    });
    let completed = AtomicUsize::new(0);
    let results = import_pool().install(|| {
        reservations
            .paths()
            .to_vec()
            .into_par_iter()
            .map(|path| {
                let result = registered_file_from_path(path);
                let completed = completed.fetch_add(1, Ordering::Relaxed) + 1;
                on_progress(ImportProgress { completed, total });
                result
            })
            .collect::<Vec<_>>()
    });
    let ImportResults {
        entries,
        password_required,
        skipped,
    } = collect_import_results(results);

    let registrations = entries
        .iter()
        .map(|entry| {
            (
                entry.entry.source_id().to_string(),
                entry.entry.registered().clone(),
            )
        })
        .collect();
    let previews = entries
        .iter()
        .filter_map(|entry| {
            entry
                .preview
                .as_ref()
                .map(|preview| (entry.entry.source_id().to_string(), preview.clone()))
        })
        .collect();
    let pending_paths = password_required
        .iter()
        .map(|file| file.original_path.clone())
        .collect::<Vec<_>>();
    reservations.finish(registrations, previews, &pending_paths);

    Ok(FilesFromPathsResult {
        files: entries
            .into_iter()
            .map(|entry| entry.entry.into_source())
            .collect(),
        password_required,
        skipped,
    })
}

/// Imports sources from paths, registering them in `registry` and returning frontend models.
///
/// Paths are deduplicated; already-registered paths are skipped.
#[cfg(test)]
pub fn files_from_paths(
    paths: impl IntoIterator<Item = String>,
    registry: &SourceRegistry,
) -> anyhow::Result<FilesFromPathsResult> {
    files_from_paths_with_progress(paths, registry, |_| {})
}
