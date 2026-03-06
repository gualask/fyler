use tauri_plugin_dialog::DialogExt;

use crate::models::{Document, MergeRequest};
use crate::optimize;
use crate::pdf::{count_pages, detect_kind_from_ext, merge_pdf_documents, prepare_doc, IMAGE_EXTENSIONS};

fn docs_from_paths(paths: impl IntoIterator<Item = String>) -> Result<Vec<Document>, String> {
    paths
        .into_iter()
        .filter_map(|path| match path_to_document(path) {
            Ok(Some(doc)) => Some(Ok(doc)),
            Ok(None) => None,
            Err(e) => Some(Err(e)),
        })
        .collect()
}

fn path_to_document(path: String) -> Result<Option<Document>, String> {
    let name = std::path::Path::new(&path)
        .file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string();

    let Some(kind) = detect_kind_from_ext(&path) else {
        return Ok(None);
    };

    let page_count = if kind == "pdf" { count_pages(&path)? } else { 1 };

    Ok(Some(Document {
        id: uuid::Uuid::new_v4().to_string(),
        path,
        name,
        page_count,
        page_spec: String::new(),
        kind: kind.to_string(),
    }))
}

#[tauri::command]
pub async fn open_pdfs_dialog(app: tauri::AppHandle) -> Result<Vec<Document>, String> {
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
    docs_from_paths(paths)
}

#[tauri::command]
pub fn open_docs_from_paths(paths: Vec<String>) -> Result<Vec<Document>, String> {
    docs_from_paths(paths)
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
    let docs = req.inputs.iter()
        .map(|input| prepare_doc(&input.path, &input.page_spec))
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
