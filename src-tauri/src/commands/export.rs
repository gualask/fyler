use std::collections::HashSet;
use std::sync::{Arc, Mutex, MutexGuard};

use tauri::State;
use tauri_plugin_dialog::DialogExt;

use super::source_not_found_error;
use crate::error::{AppError, UserFacingError, UserFacingErrorCode};
use crate::export::export_pdf;
use crate::models::{MergeRequest, MergeResult};
use crate::pdf::{image_export_preview_layout, ImageExportPreviewLayout};
use crate::source_registry::SourceRegistry;
use crate::vo::{DocKind, ImageFit, QuarterTurn};

#[derive(Clone, Default)]
/// One-shot output paths granted by the native save dialog.
pub struct OutputPathAuthorizations {
    paths: Arc<Mutex<HashSet<String>>>,
}

impl OutputPathAuthorizations {
    fn paths(&self) -> MutexGuard<'_, HashSet<String>> {
        self.paths
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn authorize(&self, path: String) {
        self.paths().insert(path);
    }

    fn consume(&self, path: &str) -> bool {
        self.paths().remove(path)
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
/// Exports the requested composition to a single PDF.
///
/// Runs on a blocking thread; progress is emitted as `"merge-progress"` events.
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    registry: State<'_, SourceRegistry>,
    output_paths: State<'_, OutputPathAuthorizations>,
    req: MergeRequest,
) -> Result<MergeResult, AppError> {
    if !output_paths.consume(&req.output_path) {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::OutputPathNotAuthorized,
        ))
        .into());
    }

    let app = app.clone();
    let registry = registry.inner().clone();
    tauri::async_runtime::spawn_blocking(move || export_pdf(&app, &registry, req))
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
    let source = registry.get(&file_id).ok_or_else(source_not_found_error)?;
    if source.kind != DocKind::Image {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::InvalidExportItemKind,
        ))
        .into());
    }

    let path = source.original_path;
    tauri::async_runtime::spawn_blocking(move || {
        image_export_preview_layout(&path, image_fit, quarter_turns)
    })
    .await
    .map_err(anyhow::Error::from)?
    .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::OutputPathAuthorizations;

    #[test]
    fn output_path_authorizations_are_single_use() {
        let authorizations = OutputPathAuthorizations::default();
        authorizations.authorize("/tmp/export.pdf".to_string());

        assert!(authorizations.consume("/tmp/export.pdf"));
        assert!(!authorizations.consume("/tmp/export.pdf"));
    }
}
