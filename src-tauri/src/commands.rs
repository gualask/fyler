use tauri_plugin_dialog::DialogExt;

use crate::models::{SourceFile, MergeRequest};
use crate::optimize;
use crate::pdf::{count_pages, detect_kind_from_ext, merge_pdf_documents, prepare_doc, IMAGE_EXTENSIONS};

fn files_from_paths(paths: impl IntoIterator<Item = String>) -> Result<Vec<SourceFile>, String> {
    paths
        .into_iter()
        .filter_map(|path| match path_to_file(path) {
            Ok(Some(f)) => Some(Ok(f)),
            Ok(None) => None,
            Err(e) => Some(Err(e)),
        })
        .collect()
}

fn path_to_file(path: String) -> Result<Option<SourceFile>, String> {
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
pub async fn open_files_dialog(app: tauri::AppHandle) -> Result<Vec<SourceFile>, String> {
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
    files_from_paths(paths)
}

#[tauri::command]
pub fn open_files_from_paths(paths: Vec<String>) -> Result<Vec<SourceFile>, String> {
    files_from_paths(paths)
}

#[tauri::command]
pub async fn save_pdf_dialog(
    app: tauri::AppHandle,
    default_filename: String,
) -> Result<String, String> {
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
pub fn rotate_pdf_page(path: String, page_num: u32, angle: i32) -> Result<String, String> {
    let tmp = crate::pdf::rotate_pdf_page(&path, page_num, angle)?;
    Ok(tmp.to_string_lossy().to_string())
}

#[tauri::command]
pub fn merge_pdfs(req: MergeRequest) -> Result<(), String> {
    let image_fit = req.optimize.as_ref()
        .and_then(|o| o.image_fit.as_deref())
        .unwrap_or("fit");

    let docs = req.inputs.iter()
        .map(|input| prepare_doc(&input.path, &input.page_spec, image_fit))
        .collect::<Result<Vec<_>, _>>()?;

    if docs.is_empty() {
        return Err("Nessun documento da unire".into());
    }

    let mut merged = merge_pdf_documents(docs)?;

    if let Some(opts) = &req.optimize {
        if opts.jpeg_quality.is_some() || opts.max_px.is_some() {
            optimize::optimize_images(&mut merged, opts)?;
        }
    }
    merged.compress();

    if let Some(parent) = std::path::Path::new(&req.output_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    merged.save(&req.output_path).map(|_| ()).map_err(|e| e.to_string())
}
