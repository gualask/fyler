use tauri_plugin_dialog::DialogExt;

use crate::models::{Document, MergeRequest};
use crate::pdf::{count_pages, extract_pages_to_temp, merge_pdf_documents, parse_page_spec};

#[tauri::command]
pub async fn open_pdfs_dialog(app: tauri::AppHandle) -> Result<Vec<Document>, String> {
    let files = app
        .dialog()
        .file()
        .add_filter("PDF", &["pdf"])
        .blocking_pick_files()
        .unwrap_or_default();

    files
        .into_iter()
        .map(|f| {
            let path_buf = f.into_path().map_err(|e| e.to_string())?;
            let path = path_buf.to_string_lossy().to_string();
            let name = path_buf
                .file_name()
                .unwrap_or_default()
                .to_string_lossy()
                .to_string();
            let page_count = count_pages(&path)?;
            Ok(Document {
                id: uuid::Uuid::new_v4().to_string(),
                path,
                name,
                page_count,
                page_spec: String::new(),
            })
        })
        .collect()
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
pub fn merge_pdfs(req: MergeRequest) -> Result<(), String> {
    let mut temp_files: Vec<std::path::PathBuf> = vec![];
    let mut input_paths: Vec<String> = vec![];

    for input in &req.inputs {
        let selected = parse_page_spec(&input.page_spec)?;
        if selected.is_empty() {
            input_paths.push(input.path.clone());
        } else {
            let total = count_pages(&input.path)?;
            for &p in &selected {
                if p > total {
                    return Err(format!(
                        "Pagina {p} non esiste in '{}' ({total} pagine totali)",
                        input.path
                    ));
                }
            }
            let tmp = extract_pages_to_temp(&input.path, &selected)?;
            input_paths.push(tmp.to_string_lossy().to_string());
            temp_files.push(tmp);
        }
    }

    if input_paths.is_empty() {
        return Err("Nessun documento da unire".into());
    }

    let mut merged = merge_pdf_documents(&input_paths)?;

    if let Some(parent) = std::path::Path::new(&req.output_path).parent() {
        std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    merged.save(&req.output_path).map_err(|e| e.to_string())?;

    for f in &temp_files {
        let _ = std::fs::remove_file(f);
    }
    Ok(())
}
