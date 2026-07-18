use std::path::Path;

use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

use super::source_not_found_error;
use crate::error::AppError;
use crate::models::{OpenFilesResult, SkippedFile, SkippedFileReason, SourceFile};
use crate::source_registry::{
    files_from_paths_with_progress, unlocked_pdf_source as build_unlocked_pdf_source,
    ImportProgress, SourceRegistry, IMAGE_EXTENSIONS,
};

const MAX_IMPORT_PROGRESS_UPDATES: usize = 100;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportWarningPayload {
    kind: &'static str,
    skipped_count: usize,
    preview: Vec<SkippedFile>,
    has_more: bool,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportProgressPayload {
    completed: usize,
    total: usize,
}

fn emit_import_warning(app: &tauri::AppHandle, skipped: &[SkippedFile]) {
    if skipped.is_empty() {
        return;
    }

    let _ = app.emit(
        "app-status",
        ImportWarningPayload {
            kind: "import-warning",
            skipped_count: skipped.len(),
            preview: skipped.iter().take(2).cloned().collect(),
            has_more: skipped.len() > 2,
        },
    );
}

fn emit_import_progress(app: &tauri::AppHandle, progress: ImportProgress) {
    let update_interval = progress.total.div_ceil(MAX_IMPORT_PROGRESS_UPDATES);
    let should_emit = progress.completed == 0
        || progress.completed == progress.total
        || (update_interval > 0 && progress.completed.is_multiple_of(update_interval));
    if !should_emit {
        return;
    }

    let _ = app.emit(
        "import-progress",
        ImportProgressPayload {
            completed: progress.completed,
            total: progress.total,
        },
    );
}

fn finalize_import(
    app: &tauri::AppHandle,
    result: crate::source_registry::FilesFromPathsResult,
    extra_skipped: Vec<SkippedFile>,
) -> OpenFilesResult {
    let mut skipped = extra_skipped;
    skipped.extend(result.skipped);
    emit_import_warning(app, &skipped);
    OpenFilesResult {
        files: result.files,
        password_required: result.password_required,
        skipped_errors: skipped,
    }
}

async fn import_paths_with_progress(
    app: &tauri::AppHandle,
    paths: Vec<String>,
    registry: SourceRegistry,
    extra_skipped: Vec<SkippedFile>,
) -> Result<OpenFilesResult, AppError> {
    let progress_app = app.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        files_from_paths_with_progress(paths, &registry, |progress| {
            emit_import_progress(&progress_app, progress);
        })
    })
    .await
    .map_err(anyhow::Error::from)??;

    Ok(finalize_import(app, result, extra_skipped))
}

fn empty_open_files_result() -> OpenFilesResult {
    OpenFilesResult {
        files: vec![],
        password_required: vec![],
        skipped_errors: vec![],
    }
}

fn path_file_name(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

fn ensure_path_is_authorized(app: &tauri::AppHandle, path: &str) -> anyhow::Result<()> {
    if app.asset_protocol_scope().is_allowed(path) {
        Ok(())
    } else {
        Err(source_not_found_error())
    }
}

fn authorized_drop_paths(
    app: &tauri::AppHandle,
    paths: Vec<String>,
) -> (Vec<String>, Vec<SkippedFile>) {
    let scope = app.asset_protocol_scope();
    let mut authorized = Vec::with_capacity(paths.len());
    let mut skipped = Vec::new();

    for path in paths {
        if scope.is_allowed(&path) {
            authorized.push(path);
        } else {
            skipped.push(SkippedFile {
                name: path_file_name(Path::new(&path)),
                reason: SkippedFileReason::PathError,
                detail: None,
            });
        }
    }

    (authorized, skipped)
}

#[tauri::command]
/// Opens a native file picker dialog and imports the selected files.
///
/// Import is performed on a blocking thread to avoid stalling the UI thread.
pub async fn open_files_dialog(
    app: tauri::AppHandle,
    filter_label: String,
    registry: State<'_, SourceRegistry>,
) -> Result<OpenFilesResult, AppError> {
    let mut filter_exts = vec!["pdf"];
    filter_exts.extend_from_slice(IMAGE_EXTENSIONS);

    let Some(files) = app
        .dialog()
        .file()
        .add_filter(&filter_label, &filter_exts)
        .blocking_pick_files()
    else {
        // User cancelled or dialog returned no selection
        return Ok(empty_open_files_result());
    };

    if files.is_empty() {
        return Ok(empty_open_files_result());
    }

    let scope = app.asset_protocol_scope();
    let mut path_skipped = Vec::new();
    let paths = files
        .into_iter()
        .filter_map(|file| match file.into_path() {
            Ok(path) => match scope.allow_file(&path) {
                Ok(()) => Some(path.to_string_lossy().to_string()),
                Err(error) => {
                    eprintln!("[warn] Failed to authorize selected file: {error}");
                    path_skipped.push(SkippedFile {
                        name: path_file_name(&path),
                        reason: SkippedFileReason::PathError,
                        detail: None,
                    });
                    None
                }
            },
            Err(e) => {
                eprintln!("[warn] Failed to resolve file path: {e}");
                path_skipped.push(SkippedFile {
                    name: String::new(),
                    reason: SkippedFileReason::PathError,
                    detail: Some(e.to_string()),
                });
                None
            }
        })
        .collect::<Vec<_>>();

    import_paths_with_progress(&app, paths, registry.inner().clone(), path_skipped).await
}

#[tauri::command]
/// Imports files from the provided filesystem paths (used for drag&drop / CLI integrations).
pub async fn open_files_from_paths(
    app: tauri::AppHandle,
    paths: Vec<String>,
    registry: State<'_, SourceRegistry>,
) -> Result<OpenFilesResult, AppError> {
    let (paths, path_skipped) = authorized_drop_paths(&app, paths);
    import_paths_with_progress(&app, paths, registry.inner().clone(), path_skipped).await
}

#[tauri::command]
/// Unlocks and registers one password-protected PDF.
pub async fn unlock_pdf_source(
    app: tauri::AppHandle,
    path: String,
    password: String,
    registry: State<'_, SourceRegistry>,
) -> Result<SourceFile, AppError> {
    ensure_path_is_authorized(&app, &path)?;
    let registry = registry.inner().clone();
    if !registry.begin_unlock(&path) {
        return Err(source_not_found_error().into());
    }

    let pending_path = path.clone();
    let result =
        tauri::async_runtime::spawn_blocking(move || build_unlocked_pdf_source(path, password))
            .await;
    let entry = match result {
        Ok(Ok(entry)) => entry,
        Ok(Err(error)) => {
            registry.restore_pending_unlock(&pending_path);
            return Err(error.into());
        }
        Err(error) => {
            registry.restore_pending_unlock(&pending_path);
            return Err(anyhow::Error::from(error).into());
        }
    };
    let (source, registered) = entry.into_parts();
    registry.finish_unlock(&pending_path, source.id.clone(), registered);
    Ok(source)
}

#[tauri::command]
/// Releases password-protected imports that the user chose to skip.
pub fn discard_pending_sources(paths: Vec<String>, registry: State<'_, SourceRegistry>) {
    registry.discard_pending_paths(&paths);
}

#[tauri::command]
/// Releases all backend resources associated with the given file IDs.
///
/// The frontend calls this when a source is removed from the session.
pub fn release_sources(file_ids: Vec<String>, registry: State<'_, SourceRegistry>) {
    registry.remove_many(&file_ids);
}

#[tauri::command]
/// Returns the compressed display preview generated during image import.
pub fn get_image_preview(
    file_id: String,
    registry: State<'_, SourceRegistry>,
) -> tauri::ipc::Response {
    tauri::ipc::Response::new(registry.get_image_preview(&file_id).unwrap_or_default())
}
