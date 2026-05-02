use std::env::consts::{ARCH, OS};
use std::fs;
use tauri::Emitter;
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::error::AppError;
use crate::export::export_pdf;
use crate::models::{MergeRequest, MergeResult, OpenFilesResult, SkippedFile};
use crate::pdf::{
    count_pages, image_export_preview_layout, ImageExportPreviewLayout, IMAGE_EXTENSIONS,
};
use crate::source_registry::{files_from_paths, SourceRegistry};

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
/// Minimal app metadata surfaced to the frontend for diagnostics/UI.
pub struct AppMetadataPayload {
    app_name: String,
    version: String,
    identifier: String,
    platform: String,
    arch: String,
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
        skipped_errors: skipped,
    }
}

/// Spawns a detached background task for each PDF file whose page count is not yet known.
///
/// When counting completes the task emits `source-page-count` (`{ id, pageCount }`) or
/// `source-page-count-error` (`{ id }`) so the frontend can update its state.
fn spawn_page_count_tasks(app: &tauri::AppHandle, files: &[crate::models::SourceFile]) {
    for file in files {
        if file.page_count.is_some() {
            continue;
        }
        let app = app.clone();
        let path = file.original_path.clone();
        let id = file.id.clone();
        tauri::async_runtime::spawn(async move {
            let result = tauri::async_runtime::spawn_blocking(move || count_pages(&path)).await;
            match result {
                Ok(Ok(count)) => {
                    let _ = app.emit(
                        "source-page-count",
                        serde_json::json!({ "id": id, "pageCount": count }),
                    );
                }
                _ => {
                    let _ = app.emit("source-page-count-error", serde_json::json!({ "id": id }));
                }
            }
        });
    }
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
        return Ok(OpenFilesResult {
            files: vec![],
            skipped_errors: vec![],
        });
    };

    if files.is_empty() {
        return Ok(OpenFilesResult {
            files: vec![],
            skipped_errors: vec![],
        });
    }

    let mut path_skipped = Vec::new();
    let paths = files
        .into_iter()
        .filter_map(|file| match file.into_path() {
            Ok(path) => Some(path.to_string_lossy().to_string()),
            Err(e) => {
                eprintln!("[warn] Failed to resolve file path: {e}");
                path_skipped.push(SkippedFile {
                    name: String::new(),
                    reason: "path_error".into(),
                    detail: Some(e.to_string()),
                });
                None
            }
        })
        .collect::<Vec<_>>();

    let registry = registry.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || files_from_paths(paths, &registry))
        .await
        .map_err(anyhow::Error::from)??;
    let import_result = finalize_import(&app, result, path_skipped);
    spawn_page_count_tasks(&app, &import_result.files);
    Ok(import_result)
}

#[tauri::command]
/// Imports files from the provided filesystem paths (used for drag&drop / CLI integrations).
pub async fn open_files_from_paths(
    app: tauri::AppHandle,
    paths: Vec<String>,
    registry: State<'_, SourceRegistry>,
) -> Result<OpenFilesResult, AppError> {
    let registry = registry.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || files_from_paths(paths, &registry))
        .await
        .map_err(anyhow::Error::from)??;
    let import_result = finalize_import(&app, result, vec![]);
    spawn_page_count_tasks(&app, &import_result.files);
    Ok(import_result)
}

#[tauri::command]
/// Releases all backend resources associated with the given file IDs.
///
/// The frontend calls this when a source is removed from the session.
pub fn release_sources(file_ids: Vec<String>, registry: State<'_, SourceRegistry>) {
    registry.remove_many(&file_ids);
}

#[tauri::command]
/// Opens a native save dialog and returns the chosen path (or empty string if cancelled).
pub async fn save_pdf_dialog(
    app: tauri::AppHandle,
    default_filename: String,
    filter_label: String,
) -> Result<String, AppError> {
    Ok(app
        .dialog()
        .file()
        .add_filter(&filter_label, &["pdf"])
        .set_file_name(&default_filename)
        .blocking_save_file()
        .and_then(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default())
}

#[tauri::command]
/// Opens a native save dialog and writes the provided text file.
///
/// Returns the saved path (or empty string if cancelled).
pub async fn save_text_file(
    app: tauri::AppHandle,
    default_filename: String,
    filter_label: String,
    content: String,
) -> Result<String, AppError> {
    let Some(path) = app
        .dialog()
        .file()
        .add_filter(&filter_label, &["txt"])
        .set_file_name(&default_filename)
        .blocking_save_file()
        .and_then(|file| file.into_path().ok())
    else {
        return Ok(String::new());
    };

    fs::write(&path, content).map_err(anyhow::Error::from)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
/// Exports the requested composition to a single PDF.
///
/// Runs on a blocking thread; progress is emitted as `"merge-progress"` events.
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    registry: State<'_, SourceRegistry>,
    req: MergeRequest,
) -> Result<MergeResult, AppError> {
    let app = app.clone();
    let registry = registry.inner().clone();
    tauri::async_runtime::spawn_blocking(move || export_pdf(&app, &registry, req))
        .await
        .map_err(anyhow::Error::from)?
        .map_err(Into::into)
}

#[tauri::command]
/// Returns build/runtime metadata for diagnostics and the "About" UI.
pub fn get_app_metadata(app: tauri::AppHandle) -> AppMetadataPayload {
    let package = app.package_info();
    AppMetadataPayload {
        app_name: package.name.clone(),
        version: package.version.to_string(),
        identifier: app.config().identifier.clone(),
        platform: OS.to_string(),
        arch: ARCH.to_string(),
    }
}

#[tauri::command]
/// Opens an external URL using the OS handler (default browser).
pub fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), AppError> {
    app.opener()
        .open_url(url, None::<String>)
        .map_err(anyhow::Error::from)?;
    Ok(())
}

#[tauri::command]
/// Computes a preview layout for exporting a single image as a PDF page.
///
/// This is used by the frontend to show an accurate export preview without duplicating layout math.
pub fn get_image_export_preview_layout(
    path: String,
    image_fit: String,
    quarter_turns: u8,
) -> Result<ImageExportPreviewLayout, AppError> {
    Ok(image_export_preview_layout(
        &path,
        &image_fit,
        quarter_turns,
    )?)
}
