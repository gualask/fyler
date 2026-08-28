use tauri::ipc::{InvokeBody, Request};
use tauri::{Emitter, Manager, State};

use crate::infrastructure::filesystem::{AtomicOutputWriter, OutputPathAuthorizations};
use crate::infrastructure::source_registry::SourceRegistry;
use crate::modules::page_composition::{
    export_page_composition as export_page_composition_use_case, preview_layout,
    CompositionPreviewLayout, GeneratedRasterStore, PageCompositionExportRequest,
    PageCompositionResult, PreviewLayoutRequest, ProgressSink,
};
use crate::modules::sources::SourceFile;
use crate::shared::error::{AppError, UserFacingError, UserFacingErrorCode};
use crate::shared::operation_progress::{OperationProgressEnvelope, OPERATION_PROGRESS_EVENT};

struct TauriProgressSink {
    app: tauri::AppHandle,
}

fn confirmed_raster_bytes(body: &InvokeBody) -> anyhow::Result<Vec<u8>> {
    match body {
        InvokeBody::Raw(bytes) => Ok(bytes.clone()),
        InvokeBody::Json(_) => anyhow::bail!("PDF page raster payload must use raw IPC bytes"),
    }
}

impl ProgressSink for TauriProgressSink {
    fn emit(&self, progress: OperationProgressEnvelope) {
        let _ = self.app.emit(OPERATION_PROGRESS_EVENT, progress);
    }
}

#[tauri::command]
/// Registers a confirmed PDF.js page raster as a workflow-owned image source.
pub async fn register_pdf_page_raster(
    app: tauri::AppHandle,
    request: Request<'_>,
    registry: State<'_, SourceRegistry>,
) -> Result<SourceFile, AppError> {
    let jpeg_bytes = confirmed_raster_bytes(request.body())?;
    let registry = registry.inner().clone();
    let source = tauri::async_runtime::spawn_blocking(move || {
        registry.register_generated_raster(&jpeg_bytes)
    })
    .await
    .map_err(anyhow::Error::from)??;
    app.asset_protocol_scope()
        .allow_file(&source.original_path)
        .map_err(anyhow::Error::from)?;
    Ok(source)
}

#[cfg(test)]
mod tests {
    use serde_json::json;

    use super::*;

    #[test]
    fn accepts_confirmed_raster_as_raw_ipc_bytes() {
        let bytes = vec![0xff, 0xd8, 0xff, 0xd9];

        assert_eq!(
            confirmed_raster_bytes(&InvokeBody::Raw(bytes.clone())).expect("raw raster"),
            bytes
        );
    }

    #[test]
    fn rejects_json_raster_payloads() {
        let error = confirmed_raster_bytes(&InvokeBody::Json(json!({ "jpegBytes": [1, 2] })))
            .expect_err("JSON raster must be rejected");

        assert!(error.to_string().contains("raw IPC bytes"));
    }
}

#[tauri::command]
/// Resolves authoritative A4 region, draw, and quality-warning geometry.
pub async fn get_page_composition_preview_layout(
    req: PreviewLayoutRequest,
    registry: State<'_, SourceRegistry>,
) -> Result<CompositionPreviewLayout, AppError> {
    let registry = registry.inner().clone();
    tauri::async_runtime::spawn_blocking(move || preview_layout(&registry, &req))
        .await
        .map_err(anyhow::Error::from)?
        .map_err(Into::into)
}

#[tauri::command]
/// Exports a complete two-region composition as one atomic A4 PDF or JPEG.
pub async fn export_page_composition(
    app: tauri::AppHandle,
    req: PageCompositionExportRequest,
    registry: State<'_, SourceRegistry>,
    output_paths: State<'_, OutputPathAuthorizations>,
    output_writer: State<'_, AtomicOutputWriter>,
) -> Result<PageCompositionResult, AppError> {
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
        export_page_composition_use_case(&progress, &registry, &output_writer, req)
    })
    .await
    .map_err(anyhow::Error::from)?
    .map_err(Into::into)
}
