use std::env::consts::{ARCH, OS};
use tauri::Emitter;
use tauri::State;
use tauri_plugin_opener::OpenerExt;
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;
use crate::export::export_pdf;
use crate::models::{MergeRequest, MergeResult, OpenFilesResult, SkippedFile};
use crate::pdf::{image_export_preview_layout, ImageExportPreviewLayout, IMAGE_EXTENSIONS};
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

#[tauri::command]
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

    let result = files_from_paths(paths, &registry)?;
    Ok(finalize_import(&app, result, path_skipped))
}

#[tauri::command]
pub fn open_files_from_paths(
    app: tauri::AppHandle,
    paths: Vec<String>,
    registry: State<'_, SourceRegistry>,
) -> Result<OpenFilesResult, AppError> {
    let result = files_from_paths(paths, &registry)?;
    Ok(finalize_import(&app, result, vec![]))
}

#[tauri::command]
pub fn release_sources(file_ids: Vec<String>, registry: State<'_, SourceRegistry>) {
    registry.remove_many(&file_ids);
}

#[tauri::command]
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
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    registry: State<'_, SourceRegistry>,
    req: MergeRequest,
) -> Result<MergeResult, AppError> {
    export_pdf(&app, &registry, req).map_err(Into::into)
}

#[tauri::command]
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
pub fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), AppError> {
    app.opener()
        .open_url(url, None::<String>)
        .map_err(anyhow::Error::from)?;
    Ok(())
}

#[tauri::command]
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
