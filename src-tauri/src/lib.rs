use lopdf::{Document as PdfDoc, Object};
use uuid::Uuid;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
struct Document {
    id: String,
    path: String,
    name: String,
    #[serde(rename = "pageCount")]
    page_count: u32,
    #[serde(rename = "pageSpec")]
    page_spec: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct MergeInput {
    path: String,
    #[serde(rename = "pageSpec")]
    page_spec: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
struct MergeRequest {
    inputs: Vec<MergeInput>,
    #[serde(rename = "outputPath")]
    output_path: String,
}

/// Parsa "1-3,5,8" → Vec<u32> pagine 1-indexed
fn parse_page_spec(spec: &str) -> Result<Vec<u32>, String> {
    if spec.trim().is_empty() {
        return Ok(vec![]);
    }
    let mut pages = vec![];
    for token in spec.split(',') {
        let token = token.trim();
        if token.is_empty() {
            return Err("token vuoto".into());
        }
        if let Some((s, e)) = token.split_once('-') {
            let start: u32 = s.parse().map_err(|_| format!("pagina non valida: {s}"))?;
            let end: u32 = e.parse().map_err(|_| format!("pagina non valida: {e}"))?;
            if start == 0 || end == 0 {
                return Err("le pagine devono essere > 0".into());
            }
            if start > end {
                return Err(format!("range invertito: {start}-{end}"));
            }
            pages.extend(start..=end);
        } else {
            let n: u32 = token.parse().map_err(|_| format!("pagina non valida: {token}"))?;
            if n == 0 {
                return Err("le pagine devono essere > 0".into());
            }
            pages.push(n);
        }
    }
    Ok(pages)
}

fn count_pages(path: &str) -> Result<u32, String> {
    PdfDoc::load(path)
        .map(|doc| doc.get_pages().len() as u32)
        .map_err(|e| e.to_string())
}

fn extract_pages_to_temp(path: &str, pages: &[u32]) -> Result<std::path::PathBuf, String> {
    let mut doc = PdfDoc::load(path).map_err(|e| e.to_string())?;
    let all_pages: Vec<u32> = doc.get_pages().keys().copied().collect();
    let to_delete: Vec<u32> = all_pages
        .into_iter()
        .filter(|p| !pages.contains(p))
        .collect();
    if !to_delete.is_empty() {
        doc.delete_pages(&to_delete);
    }
    let tmp = std::env::temp_dir().join(format!("fyler_{}.pdf", Uuid::new_v4()));
    doc.save(&tmp).map_err(|e| e.to_string())?;
    Ok(tmp)
}

/// Unisce più PDF in uno, appendendo le pagine di ciascuno al primo.
fn merge_pdf_documents(input_paths: &[String]) -> Result<PdfDoc, String> {
    let mut base = PdfDoc::load(&input_paths[0]).map_err(|e| e.to_string())?;

    for path in &input_paths[1..] {
        let mut other = PdfDoc::load(path).map_err(|e| e.to_string())?;

        // Rinumera gli oggetti di 'other' per evitare conflitti con 'base'
        other.renumber_objects_with(base.max_id + 1);

        // ID del nodo Pages radice di 'base'
        let base_pages_id = base
            .catalog()
            .map_err(|e| e.to_string())?
            .get(b"Pages")
            .and_then(|o| o.as_reference())
            .map_err(|e| e.to_string())?;

        // Raccogli i page ObjectId di 'other' (già rinumerati)
        let other_page_ids: Vec<lopdf::ObjectId> = other.page_iter().collect();
        let other_max = other.max_id;

        // Copia tutti gli oggetti di 'other' in 'base'
        base.objects.extend(other.objects);
        if other_max > base.max_id {
            base.max_id = other_max;
        }

        // Aggiorna il Parent di ogni pagina copiata → nodo Pages di 'base'
        for &page_id in &other_page_ids {
            if let Ok(page_dict) = base.get_dictionary_mut(page_id) {
                page_dict.set("Parent", Object::Reference(base_pages_id));
            }
        }

        // Aggiorna Kids e Count nel nodo Pages di 'base'
        let pages_dict = base
            .get_dictionary_mut(base_pages_id)
            .map_err(|e| e.to_string())?;

        let current_count = pages_dict
            .get(b"Count")
            .and_then(|o| o.as_i64())
            .unwrap_or(0);

        {
            let kids_obj = pages_dict.get_mut(b"Kids").map_err(|e| e.to_string())?;
            if let Object::Array(kids) = kids_obj {
                kids.extend(other_page_ids.iter().map(|&id| Object::Reference(id)));
            }
        }

        pages_dict.set(
            "Count",
            Object::Integer(current_count + other_page_ids.len() as i64),
        );
    }

    Ok(base)
}

#[tauri::command]
async fn open_pdfs_dialog(app: tauri::AppHandle) -> Result<Vec<Document>, String> {
    use tauri_plugin_dialog::DialogExt;
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
                id: Uuid::new_v4().to_string(),
                path,
                name,
                page_count,
                page_spec: String::new(),
            })
        })
        .collect()
}

#[tauri::command]
async fn save_pdf_dialog(
    app: tauri::AppHandle,
    default_filename: String,
) -> Result<String, String> {
    use tauri_plugin_dialog::DialogExt;
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
fn merge_pdfs(req: MergeRequest) -> Result<(), String> {
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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            open_pdfs_dialog,
            save_pdf_dialog,
            merge_pdfs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
