use lopdf::{Document as PdfDoc, Object};
use uuid::Uuid;

pub const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "tiff", "tif", "webp", "bmp", "ico", "tga", "qoi",
];

fn temp_pdf(prefix: &str) -> std::path::PathBuf {
    std::env::temp_dir().join(format!("fyler_{}_{}.pdf", prefix, Uuid::new_v4()))
}

/// Converte un'immagine in un PdfDoc in memoria (nessun file su disco).
fn image_to_pdf_doc(path: &str) -> Result<PdfDoc, String> {
    use lopdf::{Dictionary, Stream};

    let img = image::open(path).map_err(|e| format!("Errore apertura immagine: {e}"))?;
    let rgb = img.to_rgb8();
    let (width_px, height_px) = rgb.dimensions();
    let img_data = rgb.into_raw();

    // Dimensioni pagina in punti tipografici a 96 DPI
    let w_pt = (width_px as f64 * 72.0 / 96.0).ceil() as i64;
    let h_pt = (height_px as f64 * 72.0 / 96.0).ceil() as i64;

    let mut doc = PdfDoc::with_version("1.4");

    let mut img_dict = Dictionary::new();
    img_dict.set("Type", Object::Name(b"XObject".to_vec()));
    img_dict.set("Subtype", Object::Name(b"Image".to_vec()));
    img_dict.set("Width", Object::Integer(width_px as i64));
    img_dict.set("Height", Object::Integer(height_px as i64));
    img_dict.set("ColorSpace", Object::Name(b"DeviceRGB".to_vec()));
    img_dict.set("BitsPerComponent", Object::Integer(8));
    let img_id = doc.add_object(Stream::new(img_dict, img_data));

    let content = format!("q {w_pt} 0 0 {h_pt} 0 0 cm /Im0 Do Q\n");
    let content_id = doc.add_object(Stream::new(Dictionary::new(), content.into_bytes()));

    let mut xobject = Dictionary::new();
    xobject.set("Im0", Object::Reference(img_id));
    let mut resources = Dictionary::new();
    resources.set("XObject", Object::Dictionary(xobject));

    let mut pages_dict = Dictionary::new();
    pages_dict.set("Type", Object::Name(b"Pages".to_vec()));
    pages_dict.set("Kids", Object::Array(vec![]));
    pages_dict.set("Count", Object::Integer(1));
    let pages_id = doc.add_object(Object::Dictionary(pages_dict));

    let mut page_dict = Dictionary::new();
    page_dict.set("Type", Object::Name(b"Page".to_vec()));
    page_dict.set("Parent", Object::Reference(pages_id));
    page_dict.set(
        "MediaBox",
        Object::Array(vec![
            Object::Integer(0),
            Object::Integer(0),
            Object::Integer(w_pt),
            Object::Integer(h_pt),
        ]),
    );
    page_dict.set("Resources", Object::Dictionary(resources));
    page_dict.set("Contents", Object::Reference(content_id));
    let page_id = doc.add_object(Object::Dictionary(page_dict));

    if let Ok(pages) = doc.get_dictionary_mut(pages_id) {
        if let Ok(Object::Array(kids)) = pages.get_mut(b"Kids") {
            kids.push(Object::Reference(page_id));
        }
    }

    let mut catalog = Dictionary::new();
    catalog.set("Type", Object::Name(b"Catalog".to_vec()));
    catalog.set("Pages", Object::Reference(pages_id));
    let catalog_id = doc.add_object(Object::Dictionary(catalog));

    doc.trailer.set("Root", Object::Reference(catalog_id));

    Ok(doc)
}

/// Carica un PDF applicando la selezione pagine in memoria (nessun file temporaneo).
fn load_pdf_with_pages(path: &str, page_spec: &str) -> Result<PdfDoc, String> {
    let mut doc = PdfDoc::load(path).map_err(|e| e.to_string())?;
    let selected = parse_page_spec(page_spec)?;
    if !selected.is_empty() {
        let all_pages: Vec<u32> = doc.get_pages().keys().copied().collect();
        let total = all_pages.len() as u32;
        for &p in &selected {
            if p > total {
                return Err(format!(
                    "Pagina {p} non esiste in '{path}' ({total} pagine totali)"
                ));
            }
        }
        let selected_set: std::collections::HashSet<u32> = selected.into_iter().collect();
        let to_delete: Vec<u32> = all_pages.into_iter().filter(|p| !selected_set.contains(p)).collect();
        if !to_delete.is_empty() {
            doc.delete_pages(&to_delete);
        }
    }
    Ok(doc)
}

pub fn is_image_path(path: &str) -> bool {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    IMAGE_EXTENSIONS.contains(&ext.as_str())
}

/// Ritorna "pdf" o "image" in base all'estensione, None se non supportato.
pub fn detect_kind_from_ext(path: &str) -> Option<&'static str> {
    if is_image_path(path) {
        Some("image")
    } else if path.to_lowercase().ends_with(".pdf") {
        Some("pdf")
    } else {
        None
    }
}

/// Dato un path (immagine o PDF) e una page spec, restituisce un PdfDoc in memoria.
pub fn prepare_doc(path: &str, page_spec: &str) -> Result<PdfDoc, String> {
    if is_image_path(path) {
        image_to_pdf_doc(path)
    } else {
        load_pdf_with_pages(path, page_spec)
    }
}

/// Parsa "1-3,5,8" → Vec<u32> pagine 1-indexed.
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

pub fn rotate_pdf_page(path: &str, page_num: u32, angle: i32) -> Result<std::path::PathBuf, String> {
    let mut doc = PdfDoc::load(path).map_err(|e| e.to_string())?;

    let page_obj_id = {
        let pages = doc.get_pages();
        pages.get(&page_num).copied()
            .ok_or_else(|| format!("Pagina {page_num} non trovata"))?
    };

    let page_dict = doc.get_dictionary_mut(page_obj_id).map_err(|e| e.to_string())?;
    let current = page_dict.get(b"Rotate").and_then(|o| o.as_i64()).unwrap_or(0) as i32;
    let new_rotate = (current + angle).rem_euclid(360);
    page_dict.set("Rotate", Object::Integer(new_rotate as i64));

    let tmp = temp_pdf("rot");
    doc.compress();
    doc.save(&tmp).map_err(|e| e.to_string())?;
    Ok(tmp)
}

pub fn count_pages(path: &str) -> Result<u32, String> {
    PdfDoc::load(path)
        .map(|doc| doc.get_pages().len() as u32)
        .map_err(|e| e.to_string())
}

/// Unisce più PdfDoc in uno, appendendo le pagine di ciascuno al primo.
pub fn merge_pdf_documents(mut docs: Vec<PdfDoc>) -> Result<PdfDoc, String> {
    let mut base = docs.remove(0);

    let base_pages_id = base
        .catalog()
        .map_err(|e| e.to_string())?
        .get(b"Pages")
        .and_then(|o| o.as_reference())
        .map_err(|e| e.to_string())?;

    for mut other in docs {
        other.renumber_objects_with(base.max_id + 1);

        let other_page_ids: Vec<lopdf::ObjectId> = other.page_iter().collect();
        let other_max = other.max_id;

        base.objects.extend(other.objects);
        if other_max > base.max_id {
            base.max_id = other_max;
        }

        for &page_id in &other_page_ids {
            if let Ok(page_dict) = base.get_dictionary_mut(page_id) {
                page_dict.set("Parent", Object::Reference(base_pages_id));
            }
        }

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
