use std::sync::atomic::{AtomicUsize, Ordering};
use std::sync::OnceLock;

use rayon::prelude::*;
use rayon::ThreadPoolBuilder;

use super::contracts::{PasswordProtectedFile, SkippedFile, SourceFile};
use super::import_candidates::{collect_import_results, registered_file_from_path, ImportResults};
use super::ports::{ImagePreviewBytes, SourceImport, SourceLifecycle, SourceRegistration};

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

struct ImportPathReservations<'registry, R: SourceLifecycle> {
    registry: &'registry R,
    paths: Vec<String>,
    finished: bool,
}

impl<'registry, R: SourceLifecycle> ImportPathReservations<'registry, R> {
    fn new(registry: &'registry R, paths: impl IntoIterator<Item = String>) -> Self {
        Self {
            registry,
            paths: registry.reserve_import_paths(paths),
            finished: false,
        }
    }

    fn paths(&self) -> &[String] {
        &self.paths
    }

    fn finish(
        mut self,
        entries: Vec<SourceRegistration>,
        previews: Vec<(String, ImagePreviewBytes)>,
        password_required_paths: &[String],
    ) {
        self.registry
            .finish_import_batch(&self.paths, entries, previews, password_required_paths);
        self.finished = true;
    }
}

impl<R: SourceLifecycle> Drop for ImportPathReservations<'_, R> {
    fn drop(&mut self) {
        if !self.finished {
            self.registry.cancel_import_paths(&self.paths);
        }
    }
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

/// Imports sources from paths and reports each completed candidate.
///
/// The callback can run concurrently on the dedicated import pool. Every completed count is
/// reported once and includes skipped and password-protected files; consumers should tolerate
/// out-of-order delivery.
pub fn files_from_paths_with_progress<F, R>(
    paths: impl IntoIterator<Item = String>,
    registry: &R,
    on_progress: F,
) -> anyhow::Result<FilesFromPathsResult>
where
    F: Fn(ImportProgress) + Sync,
    R: SourceLifecycle + SourceImport,
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
                let result = registered_file_from_path(registry, path);
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
        .map(|entry| entry.registration.clone())
        .collect();
    let previews = entries
        .iter()
        .filter_map(|entry| {
            entry
                .preview
                .as_ref()
                .map(|preview| (entry.registration.source.id.clone(), preview.clone()))
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
            .map(|entry| entry.registration.source)
            .collect(),
        password_required,
        skipped,
    })
}

/// Imports sources from paths, registering them in the source lifecycle port and returning
/// frontend models. Paths are deduplicated; already-registered paths are skipped.
#[cfg(test)]
pub fn files_from_paths<R: SourceLifecycle + SourceImport>(
    paths: impl IntoIterator<Item = String>,
    registry: &R,
) -> anyhow::Result<FilesFromPathsResult> {
    files_from_paths_with_progress(paths, registry, |_| {})
}
