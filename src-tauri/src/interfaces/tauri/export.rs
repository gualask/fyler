use tauri::{Emitter, State};
use tauri_plugin_dialog::DialogExt;

use crate::capabilities::pdf::image_embedding::ImageExportPreviewLayout;
use crate::infrastructure::filesystem::{AtomicOutputWriter, OutputPathAuthorizations};
use crate::infrastructure::source_registry::SourceRegistry;
use crate::modules::merge::{
    export_pdf, image_export_preview_layout, ImageFit, MergeRequest, MergeResult, ProgressSink,
    QuarterTurn,
};
use crate::shared::error::{AppError, UserFacingError, UserFacingErrorCode};
use crate::shared::operation_progress::{OperationProgressEnvelope, OPERATION_PROGRESS_EVENT};

struct TauriProgressSink {
    app: tauri::AppHandle,
}

impl ProgressSink for TauriProgressSink {
    fn emit(&self, progress: OperationProgressEnvelope) {
        let _ = self.app.emit(OPERATION_PROGRESS_EVENT, progress);
    }
}

#[tauri::command]
/// Opens a native save dialog and returns the chosen path (or empty string if cancelled).
pub async fn save_pdf_dialog(
    app: tauri::AppHandle,
    default_filename: String,
    filter_label: String,
    output_paths: State<'_, OutputPathAuthorizations>,
) -> Result<String, AppError> {
    let path = app
        .dialog()
        .file()
        .add_filter(&filter_label, &["pdf"])
        .set_file_name(&default_filename)
        .blocking_save_file()
        .and_then(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();
    if !path.is_empty() {
        output_paths.authorize(path.clone());
    }
    Ok(path)
}

#[tauri::command]
/// Opens a native save dialog for a validated page-composition output format.
pub async fn save_export_dialog(
    app: tauri::AppHandle,
    default_filename: String,
    filter_label: String,
    extension: String,
    output_paths: State<'_, OutputPathAuthorizations>,
) -> Result<String, AppError> {
    let extension = match extension.as_str() {
        "pdf" => "pdf",
        "jpg" => "jpg",
        _ => return Err(anyhow::anyhow!("unsupported export extension").into()),
    };
    let path = app
        .dialog()
        .file()
        .add_filter(&filter_label, &[extension])
        .set_file_name(&default_filename)
        .blocking_save_file()
        .and_then(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();
    if !path.is_empty() {
        output_paths.authorize(path.clone());
    }
    Ok(path)
}

#[tauri::command]
/// Exports the requested composition to a single PDF.
///
/// Runs on a blocking thread; progress is emitted as versioned `"operation-progress"` events.
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    registry: State<'_, SourceRegistry>,
    output_paths: State<'_, OutputPathAuthorizations>,
    output_writer: State<'_, AtomicOutputWriter>,
    req: MergeRequest,
) -> Result<MergeResult, AppError> {
    if !output_paths.consume(&req.output_path) {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::OutputPathNotAuthorized,
        ))
        .into());
    }

    let progress = TauriProgressSink { app };
    let registry = registry.inner().clone();
    let output_writer = *output_writer.inner();
    tauri::async_runtime::spawn_blocking(move || {
        export_pdf(&progress, &registry, &output_writer, req)
    })
    .await
    .map_err(anyhow::Error::from)?
    .map_err(Into::into)
}

#[tauri::command]
/// Computes a preview layout for exporting a single image as a PDF page.
///
/// This is used by the frontend to show an accurate export preview without duplicating layout math.
pub async fn get_image_export_preview_layout(
    file_id: String,
    image_fit: ImageFit,
    quarter_turns: QuarterTurn,
    registry: State<'_, SourceRegistry>,
) -> Result<ImageExportPreviewLayout, AppError> {
    let registry = registry.inner().clone();
    tauri::async_runtime::spawn_blocking(move || {
        image_export_preview_layout(&file_id, image_fit, quarter_turns, &registry)
    })
    .await
    .map_err(anyhow::Error::from)?
    .map_err(Into::into)
}
