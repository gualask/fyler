use lopdf::{Document as PdfDoc, Object};
use uuid::Uuid;

/// Parsa "1-3,5,8" → Vec<u32> pagine 1-indexed
pub fn parse_page_spec(spec: &str) -> Result<Vec<u32>, String> {
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

pub fn count_pages(path: &str) -> Result<u32, String> {
    PdfDoc::load(path)
        .map(|doc| doc.get_pages().len() as u32)
        .map_err(|e| e.to_string())
}

pub fn extract_pages_to_temp(path: &str, pages: &[u32]) -> Result<std::path::PathBuf, String> {
    let mut doc = PdfDoc::load(path).map_err(|e| e.to_string())?;
    let all_pages: Vec<u32> = doc.get_pages().keys().copied().collect();
    let to_delete: Vec<u32> = all_pages.into_iter().filter(|p| !pages.contains(p)).collect();
    if !to_delete.is_empty() {
        doc.delete_pages(&to_delete);
    }
    let tmp = std::env::temp_dir().join(format!("fyler_{}.pdf", Uuid::new_v4()));
    doc.save(&tmp).map_err(|e| e.to_string())?;
    Ok(tmp)
}

/// Unisce più PDF in uno, appendendo le pagine di ciascuno al primo.
pub fn merge_pdf_documents(input_paths: &[String]) -> Result<PdfDoc, String> {
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
