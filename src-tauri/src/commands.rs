use tauri::Emitter;
use tauri::State;
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;
use crate::export::export_pdf;
use crate::models::{MergeRequest, SourceFile};
use crate::pdf::{image_export_preview_layout, ImageExportPreviewLayout, IMAGE_EXTENSIONS};
use crate::source_registry::{files_from_paths, SourceRegistry};

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportWarningPayload {
    kind: &'static str,
    skipped_count: usize,
    preview: Vec<String>,
    has_more: bool,
}

fn emit_import_warning(app: &tauri::AppHandle, skipped_errors: &[String]) {
    if skipped_errors.is_empty() {
        return;
    }

    let _ = app.emit(
        "app-status",
        ImportWarningPayload {
            kind: "import-warning",
            skipped_count: skipped_errors.len(),
            preview: skipped_errors.iter().take(2).cloned().collect(),
            has_more: skipped_errors.len() > 2,
        },
    );
}

#[tauri::command]
pub async fn open_files_dialog(
    app: tauri::AppHandle,
    filter_label: String,
    registry: State<'_, SourceRegistry>,
) -> Result<Vec<SourceFile>, AppError> {
    let mut filter_exts = vec!["pdf"];
    filter_exts.extend_from_slice(IMAGE_EXTENSIONS);

    let files = app
        .dialog()
        .file()
        .add_filter(&filter_label, &filter_exts)
        .blocking_pick_files()
        .unwrap_or_default();

    let paths = files
        .into_iter()
        .filter_map(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().to_string());

    let result = files_from_paths(paths, &registry)?;
    emit_import_warning(&app, &result.skipped_errors);
    Ok(result.files)
}

#[tauri::command]
pub fn open_files_from_paths(
    app: tauri::AppHandle,
    paths: Vec<String>,
    registry: State<'_, SourceRegistry>,
) -> Result<Vec<SourceFile>, AppError> {
    let result = files_from_paths(paths, &registry)?;
    emit_import_warning(&app, &result.skipped_errors);
    Ok(result.files)
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
) -> Result<(), AppError> {
    export_pdf(&app, &registry, req).map_err(Into::into)
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
