use tauri::{Emitter, Manager, State};
use tauri_plugin_dialog::DialogExt;

use crate::infrastructure::filesystem::{BatchDestinationAuthorizations, NativeBatchFileSystem};
use crate::modules::batch_compression::{
    compress_batch_with_progress as compress_batch_use_case, BatchCompressionRequest,
    BatchCompressionResult, BatchCompressionSession, BatchFileResult, BatchProgressSink,
    PixelDimensions,
};
use crate::modules::sources::ImportProgress;
use crate::shared::error::{AppError, UserFacingError, UserFacingErrorCode};

use super::sources::emit_import_progress;

const BATCH_FILE_COMPLETED_EVENT: &str = "batch-compression-file-completed";

struct TauriBatchProgressSink {
    app: tauri::AppHandle,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct BatchFileCompletedEvent {
    version: u8,
    file: BatchFileResult,
}

impl BatchProgressSink for TauriBatchProgressSink {
    fn file_completed(&self, result: &BatchFileResult) {
        let _ = self.app.emit(
            BATCH_FILE_COMPLETED_EVENT,
            BatchFileCompletedEvent {
                version: 1,
                file: result.clone(),
            },
        );
    }
}

#[derive(serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PickedBatchSource {
    path: String,
    name: String,
    original_bytes: u64,
    original_dimensions: Option<PixelDimensions>,
    page_count: Option<u32>,
}

fn inspect_source(path: std::path::PathBuf) -> PickedBatchSource {
    const MAX_PDF_INSPECTION_BYTES: u64 = 256 * 1024 * 1024;
    let original_bytes = std::fs::metadata(&path)
        .map(|metadata| metadata.len())
        .unwrap_or(0);
    let extension = path
        .extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .unwrap_or_default();
    let original_dimensions = matches!(extension.as_str(), "jpg" | "jpeg" | "png" | "webp" | "bmp")
        .then(|| {
            crate::capabilities::raster_compression::source_image_dimensions(
                path.to_string_lossy().as_ref(),
            )
            .ok()
            .map(PixelDimensions::from)
        })
        .flatten();
    let page_count = (extension == "pdf" && original_bytes <= MAX_PDF_INSPECTION_BYTES)
        .then(|| {
            let bytes = std::fs::read(&path).ok()?;
            let document = lopdf::Document::load_mem_with_options(
                &bytes,
                lopdf::LoadOptions::with_max_decompressed_size(256 * 1024 * 1024),
            )
            .ok()?;
            u32::try_from(document.get_pages().len()).ok()
        })
        .flatten();
    PickedBatchSource {
        name: path
            .file_name()
            .unwrap_or_default()
            .to_string_lossy()
            .to_string(),
        original_bytes,
        original_dimensions,
        page_count,
        path: path.to_string_lossy().to_string(),
    }
}

fn requires_image_preview(path: &std::path::Path) -> bool {
    path.extension()
        .map(|value| value.to_string_lossy().to_ascii_lowercase())
        .is_some_and(|extension| {
            matches!(extension.as_str(), "jpg" | "jpeg" | "png" | "webp" | "bmp")
        })
}

async fn authorize_and_inspect_sources(
    app: &tauri::AppHandle,
    paths: Vec<std::path::PathBuf>,
) -> Result<Vec<PickedBatchSource>, AppError> {
    for path in &paths {
        app.asset_protocol_scope()
            .allow_file(path)
            .map_err(anyhow::Error::from)?;
    }

    let progress_app = app.clone();
    let total = paths.len();
    let sources = tauri::async_runtime::spawn_blocking(move || {
        emit_import_progress(
            &progress_app,
            ImportProgress {
                completed: 0,
                total,
            },
        );
        let mut completed = 0;
        paths
            .into_iter()
            .map(|path| {
                let needs_preview = requires_image_preview(&path);
                let source = inspect_source(path);
                if !needs_preview {
                    completed += 1;
                    emit_import_progress(&progress_app, ImportProgress { completed, total });
                }
                source
            })
            .collect()
    })
    .await
    .map_err(anyhow::Error::from)?;
    Ok(sources)
}

#[tauri::command]
/// Selects source files without importing them into another workflow's registry.
pub async fn pick_batch_compression_sources(
    app: tauri::AppHandle,
    filter_label: String,
) -> Result<Vec<PickedBatchSource>, AppError> {
    let paths = app
        .dialog()
        .file()
        .add_filter(
            &filter_label,
            &[
                "pdf", "jpg", "jpeg", "png", "webp", "bmp", "gif", "tif", "tiff", "ico",
            ],
        )
        .blocking_pick_files()
        .unwrap_or_default()
        .into_iter()
        .filter_map(|file| file.into_path().ok())
        .collect::<Vec<_>>();
    authorize_and_inspect_sources(&app, paths).await
}

#[tauri::command]
/// Authorizes and inspects files received from native drag-and-drop.
pub async fn inspect_batch_compression_sources(
    app: tauri::AppHandle,
    paths: Vec<String>,
) -> Result<Vec<PickedBatchSource>, AppError> {
    let paths = paths.into_iter().map(std::path::PathBuf::from).collect();
    authorize_and_inspect_sources(&app, paths).await
}

#[tauri::command]
/// Selects and authorizes an exact destination directory for batch outputs.
pub async fn pick_batch_compression_destination(
    app: tauri::AppHandle,
    destinations: State<'_, BatchDestinationAuthorizations>,
) -> Result<String, AppError> {
    let path = app
        .dialog()
        .file()
        .blocking_pick_folder()
        .and_then(|folder| folder.into_path().ok())
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();
    if !path.is_empty() {
        destinations.authorize(path.clone());
    }
    Ok(path)
}

#[tauri::command]
/// Executes one mixed compression run on a bounded native worker pool.
pub async fn compress_batch(
    app: tauri::AppHandle,
    req: BatchCompressionRequest,
    destinations: State<'_, BatchDestinationAuthorizations>,
    session: State<'_, BatchCompressionSession>,
    filesystem: State<'_, NativeBatchFileSystem>,
) -> Result<BatchCompressionResult, AppError> {
    if !destinations.contains(&req.destination_path) {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::OutputPathNotAuthorized,
        ))
        .into());
    }
    for file in &req.files {
        if !app.asset_protocol_scope().is_allowed(&file.source_path) {
            return Err(anyhow::Error::new(UserFacingError::new(
                UserFacingErrorCode::SourceNotFound,
            ))
            .into());
        }
    }

    let progress = TauriBatchProgressSink { app };
    let session = session.inner().clone();
    let filesystem = *filesystem.inner();
    tauri::async_runtime::spawn_blocking(move || {
        compress_batch_use_case(&progress, &session, &filesystem, req)
    })
    .await
    .map_err(anyhow::Error::from)?
    .map_err(Into::into)
}
