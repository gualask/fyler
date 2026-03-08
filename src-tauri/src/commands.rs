use anyhow::bail;
use rayon::prelude::*;
use tauri::Emitter;
use tauri_plugin_dialog::DialogExt;

use crate::error::AppError;
use crate::models::{MergeRequest, SourceFile};
use crate::optimize;
use crate::pdf::{count_pages, detect_kind_from_ext, merge_pdf_documents, prepare_doc, IMAGE_EXTENSIONS};

fn files_from_paths(paths: impl IntoIterator<Item = String>) -> anyhow::Result<Vec<SourceFile>> {
    paths
        .into_iter()
        .collect::<Vec<_>>()
        .into_par_iter()
        .filter_map(|path| match path_to_file(path) {
            Ok(Some(f)) => Some(Ok(f)),
            Ok(None) => None,
            Err(e) => Some(Err(e)),
        })
        .collect()
}

fn path_to_file(path: String) -> anyhow::Result<Option<SourceFile>> {
    let name = std::path::Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let Some(kind) = detect_kind_from_ext(&path) else {
        return Ok(None);
    };

    let page_count = if kind == "pdf" { count_pages(&path)? } else { 1 };

    Ok(Some(SourceFile {
        id: uuid::Uuid::new_v4().to_string(),
        path,
        name,
        page_count,
        page_spec: String::new(),
        kind: kind.to_string(),
    }))
}

#[tauri::command]
pub async fn open_files_dialog(app: tauri::AppHandle) -> Result<Vec<SourceFile>, AppError> {
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
        .filter_map(|f| f.into_path().ok())
        .map(|p| p.to_string_lossy().to_string());
    Ok(files_from_paths(paths)?)
}

#[tauri::command]
pub fn open_files_from_paths(paths: Vec<String>) -> Result<Vec<SourceFile>, AppError> {
    Ok(files_from_paths(paths)?)
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
        .and_then(|f| f.into_path().ok())
        .map(|p| p.to_string_lossy().to_string())
        .unwrap_or_default())
}

#[tauri::command]
pub fn rotate_pdf_page(path: String, page_num: u32, angle: i32) -> Result<String, AppError> {
    let tmp = crate::pdf::rotate_pdf_page(&path, page_num, angle)?;
    Ok(tmp.to_string_lossy().to_string())
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
pub async fn merge_pdfs(app: tauri::AppHandle, req: MergeRequest) -> Result<(), AppError> {
    merge_pdfs_inner(app, req).map_err(Into::into)
}

fn merge_pdfs_inner(app: tauri::AppHandle, req: MergeRequest) -> anyhow::Result<()> {
    let image_fit = req.optimize.as_ref()
        .and_then(|o| o.image_fit.as_deref())
        .unwrap_or("fit");

    emit_progress(&app, "Preparazione documenti...", 0);

    let docs = req.inputs.par_iter()
        .map(|input| prepare_doc(&input.path, &input.page_spec, image_fit))
        .collect::<anyhow::Result<Vec<_>>>()?;

    if docs.is_empty() {
        bail!("Nessun documento da unire");
    }

    emit_progress(&app, "Unione pagine...", 60);
    let mut merged = merge_pdf_documents(docs)?;

    if let Some(opts) = &req.optimize {
        if opts.jpeg_quality.is_some() || opts.max_px.is_some() {
            emit_progress(&app, "Ottimizzazione immagini...", 80);
            optimize::optimize_images(&mut merged, opts)?;
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
