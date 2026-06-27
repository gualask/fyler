use std::collections::HashSet;
use std::fs;
use std::sync::OnceLock;

use rayon::prelude::*;
use rayon::ThreadPoolBuilder;

use crate::models::{PasswordProtectedFile, SkippedFile, SourceFile};
use crate::pdf::{count_pages, detect_kind_from_ext, is_password_required_error};
use crate::vo::DocKind;

use super::registry::{RegisteredSource, SourceRegistry};

/// Result of an import operation executed from filesystem paths.
pub struct FilesFromPathsResult {
    /// Successfully imported files (in no particular order).
    pub files: Vec<SourceFile>,
    /// PDFs that require a password before they can be imported.
    pub password_required: Vec<PasswordProtectedFile>,
    /// Files that were skipped, plus a reason suitable for UI messaging.
    pub skipped: Vec<SkippedFile>,
}

static IMPORT_POOL: OnceLock<rayon::ThreadPool> = OnceLock::new();

enum ImportCandidate {
    Ready(SourceFile, RegisteredSource),
    PasswordRequired(PasswordProtectedFile),
}

fn registered_file_from_path(path: String) -> Result<ImportCandidate, SkippedFile> {
    let name = std::path::Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let Some(kind) = detect_kind_from_ext(&path) else {
        return Err(SkippedFile {
            name,
            reason: "unsupported_format".into(),
            detail: None,
        });
    };

    let byte_size = fs::metadata(&path).map(|meta| meta.len()).unwrap_or(0);
    let page_count: Option<u32> = if kind == DocKind::Pdf {
        match count_pages(&path) {
            Ok(count) => Some(count),
            Err(error) if is_password_required_error(&error) => {
                return Ok(ImportCandidate::PasswordRequired(PasswordProtectedFile {
                    original_path: path,
                    name,
                    byte_size,
                }));
            }
            Err(error) => {
                return Err(SkippedFile {
                    name,
                    reason: "read_error".into(),
                    detail: Some(error.to_string()),
                });
            }
        }
    } else {
        Some(1)
    };
    let id = uuid::Uuid::new_v4().to_string();

    let source = SourceFile {
        id: id.clone(),
        original_path: path.clone(),
        name: name.clone(),
        byte_size,
        page_count,
        kind,
    };
    let registered = RegisteredSource {
        original_path: path,
        name,
        kind,
        password: None,
    };

    Ok(ImportCandidate::Ready(source, registered))
}

/// Imports sources from paths, registering them in `registry` and returning frontend models.
///
/// Paths are deduplicated; already-registered paths are skipped.
pub fn files_from_paths(
    paths: impl IntoIterator<Item = String>,
    registry: &SourceRegistry,
) -> anyhow::Result<FilesFromPathsResult> {
    // Deduplicate input paths and skip sources already present in the current session.
    let mut accepted_paths = Vec::new();
    let mut seen_paths = HashSet::new();

    for path in paths {
        if !seen_paths.insert(path.clone()) {
            continue;
        }
        if registry.contains_original_path(&path) {
            continue;
        }
        accepted_paths.push(path);
    }

    let pool = IMPORT_POOL.get_or_init(|| {
        // Keep a small dedicated pool to avoid oversubscribing the system during import.
        ThreadPoolBuilder::new()
            .num_threads(4)
            .thread_name(|index| format!("fyler-import-{index}"))
            .build()
            .expect("failed to build import threadpool")
    });
    let results = pool.install(|| {
        accepted_paths
            .into_par_iter()
            .map(registered_file_from_path)
            .collect::<Vec<_>>()
    });

    let mut entries = Vec::new();
    let mut password_required = Vec::new();
    let mut skipped = Vec::new();
    for result in results {
        match result {
            Ok(ImportCandidate::Ready(source, registered)) => entries.push((source, registered)),
            Ok(ImportCandidate::PasswordRequired(file)) => password_required.push(file),
            Err(skip) => skipped.push(skip),
        }
    }

    registry.insert_many(
        entries
            .iter()
            .map(|(source, registered)| (source.id.clone(), registered.clone())),
    );
    Ok(FilesFromPathsResult {
        files: entries.into_iter().map(|(source, _)| source).collect(),
        password_required,
        skipped,
    })
}
