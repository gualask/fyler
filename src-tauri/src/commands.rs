use anyhow::bail;
use tauri::{Emitter, State};
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;
use crate::export::build_documents;
use crate::models::{MergeRequest, SourceFile};
use crate::optimize;
use crate::pdf::{merge_pdf_documents, IMAGE_EXTENSIONS};
use crate::source_registry::{files_from_paths, SourceRegistry};

#[tauri::command]
pub async fn open_files_dialog(
    app: tauri::AppHandle,
    registry: State<'_, SourceRegistry>,
) -> Result<Vec<SourceFile>, AppError> {
    let mut filter_exts = vec!["pdf"];
    filter_exts.extend_from_slice(IMAGE_EXTENSIONS);

    let files = app
        .dialog()
        .file()
        .add_filter("PDF e immagini", &filter_exts)
        .blocking_pick_files()
        .unwrap_or_default();

    let paths = files
        .into_iter()
        .filter_map(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().to_string());

    Ok(files_from_paths(paths, &registry)?)
}

#[tauri::command]
pub fn open_files_from_paths(
    paths: Vec<String>,
    registry: State<'_, SourceRegistry>,
) -> Result<Vec<SourceFile>, AppError> {
    Ok(files_from_paths(paths, &registry)?)
}

#[tauri::command]
pub fn release_sources(file_ids: Vec<String>, registry: State<'_, SourceRegistry>) {
    registry.remove_many(&file_ids);
}

#[tauri::command]
pub async fn save_pdf_dialog(
    app: tauri::AppHandle,
    default_filename: String,
) -> Result<String, AppError> {
    Ok(app
        .dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .set_file_name(&default_filename)
        .blocking_save_file()
        .and_then(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default())
}

#[derive(serde::Serialize, Clone)]
struct ProgressPayload {
    message: &'static str,
    progress: u8,
}

fn emit_progress(app: &tauri::AppHandle, message: &'static str, progress: u8) {
    let _ = app.emit("merge-progress", ProgressPayload { message, progress });
}

#[tauri::command]
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    registry: State<'_, SourceRegistry>,
    req: MergeRequest,
) -> Result<(), AppError> {
    merge_pdfs_inner(app, &registry, req).map_err(Into::into)
}

fn merge_pdfs_inner(
    app: tauri::AppHandle,
    registry: &SourceRegistry,
    req: MergeRequest,
) -> anyhow::Result<()> {
    let image_fit = req
        .optimize
        .as_ref()
        .and_then(|options| options.image_fit.as_deref())
        .unwrap_or("fit");

    emit_progress(&app, "Preparazione documenti...", 0);
    let docs = build_documents(&req, registry, image_fit)?;
    if docs.is_empty() {
        bail!("Nessun documento da unire");
    }

    emit_progress(&app, "Unione pagine...", 60);
    let mut merged = merge_pdf_documents(docs)?;

    if let Some(options) = &req.optimize {
        if options.jpeg_quality.is_some() || options.max_px.is_some() {
            emit_progress(&app, "Ottimizzazione immagini...", 80);
            optimize::optimize_images(&mut merged, options)?;
        }
    }

    emit_progress(&app, "Salvataggio...", 90);
    if let Some(parent) = std::path::Path::new(&req.output_path).parent() {
        std::fs::create_dir_all(parent)?;
    }
    let mut file = std::fs::File::create(&req.output_path)?;
    merged.save_modern(&mut file)?;
    Ok(())
}
