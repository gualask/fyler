use anyhow::{bail, Context, Result};
use image::DynamicImage;
use lopdf::{Document as PdfDoc, Object};
use rayon::prelude::*;

pub const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "tiff", "tif", "webp", "bmp", "ico", "tga", "qoi",
];

fn name(s: &[u8]) -> Object { Object::Name(s.to_vec()) }
fn int(n: i64) -> Object { Object::Integer(n) }

pub fn quarter_turns_to_degrees(turns: u8) -> Result<i32> {
    match turns {
        0..=3 => Ok(i32::from(turns) * 90),
        other => bail!("Rotazione non supportata: {other}"),
    }
}

fn rotate_dynamic_image(img: DynamicImage, quarter_turns: u8) -> Result<DynamicImage> {
    Ok(match quarter_turns_to_degrees(quarter_turns)? {
        0 => img,
        90 => img.rotate90(),
        180 => img.rotate180(),
        270 => img.rotate270(),
        _ => unreachable!(),
    })
}

fn image_to_pdf_doc_from_image(img: DynamicImage, image_fit: &str) -> Result<PdfDoc> {
    use lopdf::{Dictionary, Stream};

    let rgb = img.to_rgb8();
    let (width_px, height_px) = rgb.dimensions();
    let img_data = rgb.into_raw();

    let w_pt = width_px as f64 * 72.0 / 96.0;
    let h_pt = height_px as f64 * 72.0 / 96.0;

    const A4_W: f64 = 595.0;
    const A4_H: f64 = 842.0;

    let (page_w, page_h, content) = match image_fit {
        "contain" => {
            let scale = (A4_W / w_pt).min(A4_H / h_pt);
            let sw = w_pt * scale;
            let sh = h_pt * scale;
            let tx = (A4_W - sw) / 2.0;
            let ty = (A4_H - sh) / 2.0;
            let content = format!(
                "1 g 0 0 {A4_W} {A4_H} re f q {sw:.4} 0 0 {sh:.4} {tx:.4} {ty:.4} cm /Im0 Do Q\n"
            );
            (A4_W.ceil() as i64, A4_H.ceil() as i64, content)
        }
        "cover" => {
            let scale = (A4_W / w_pt).max(A4_H / h_pt);
            let sw = w_pt * scale;
            let sh = h_pt * scale;
            let tx = (A4_W - sw) / 2.0;
            let ty = (A4_H - sh) / 2.0;
            let content = format!(
                "q 0 0 {A4_W} {A4_H} re W n {sw:.4} 0 0 {sh:.4} {tx:.4} {ty:.4} cm /Im0 Do Q\n"
            );
            (A4_W.ceil() as i64, A4_H.ceil() as i64, content)
        }
        _ => {
            let pw = w_pt.ceil() as i64;
            let ph = h_pt.ceil() as i64;
            let content = format!("q {pw} 0 0 {ph} 0 0 cm /Im0 Do Q\n");
            (pw, ph, content)
        }
    };

    let mut doc = PdfDoc::with_version("1.4");

    let mut img_dict = Dictionary::new();
    img_dict.set("Type", name(b"XObject"));
    img_dict.set("Subtype", name(b"Image"));
    img_dict.set("Width", int(width_px as i64));
    img_dict.set("Height", int(height_px as i64));
    img_dict.set("ColorSpace", name(b"DeviceRGB"));
    img_dict.set("BitsPerComponent", int(8));
    let img_id = doc.add_object(Stream::new(img_dict, img_data));

    let content_id = doc.add_object(Stream::new(Dictionary::new(), content.into_bytes()));

    let mut xobject = Dictionary::new();
    xobject.set("Im0", Object::Reference(img_id));
    let mut resources = Dictionary::new();
    resources.set("XObject", Object::Dictionary(xobject));

    let mut pages_dict = Dictionary::new();
    pages_dict.set("Type", name(b"Pages"));
    pages_dict.set("Kids", Object::Array(vec![]));
    pages_dict.set("Count", int(1));
    let pages_id = doc.add_object(Object::Dictionary(pages_dict));

    let mut page_dict = lopdf::Dictionary::new();
    page_dict.set("Type", name(b"Page"));
    page_dict.set("Parent", Object::Reference(pages_id));
    page_dict.set(
        "MediaBox",
        Object::Array(vec![int(0), int(0), int(page_w), int(page_h)]),
    );
    page_dict.set("Resources", Object::Dictionary(resources));
    page_dict.set("Contents", Object::Reference(content_id));
    let page_id = doc.add_object(Object::Dictionary(page_dict));

    if let Ok(pages) = doc.get_dictionary_mut(pages_id) {
        if let Ok(Object::Array(kids)) = pages.get_mut(b"Kids") {
            kids.push(Object::Reference(page_id));
        }
    }

    let mut catalog = lopdf::Dictionary::new();
    catalog.set("Type", name(b"Catalog"));
    catalog.set("Pages", Object::Reference(pages_id));
    let catalog_id = doc.add_object(Object::Dictionary(catalog));

    doc.trailer.set("Root", Object::Reference(catalog_id));
    Ok(doc)
}

pub fn image_to_pdf_doc(path: &str, image_fit: &str, quarter_turns: u8) -> Result<PdfDoc> {
    let img = image::open(path).context("Errore apertura immagine")?;
    image_to_pdf_doc_from_image(rotate_dynamic_image(img, quarter_turns)?, image_fit)
}

pub fn is_image_path(path: &str) -> bool {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    IMAGE_EXTENSIONS.contains(&ext.as_str())
}

pub fn detect_kind_from_ext(path: &str) -> Option<&'static str> {
    if is_image_path(path) {
        Some("image")
    } else if path.to_lowercase().ends_with(".pdf") {
        Some("pdf")
    } else {
        None
    }
}

fn apply_pdf_rotation(doc: &mut PdfDoc, page_num: u32, quarter_turns: u8) -> Result<()> {
    let page_obj_id = {
        let pages = doc.get_pages();
        pages.get(&page_num)
            .copied()
            .with_context(|| format!("Pagina {page_num} non trovata"))?
    };

    let page_dict = doc.get_dictionary_mut(page_obj_id)?;
    let current = page_dict
        .get(b"Rotate")
        .and_then(|obj| obj.as_i64())
        .unwrap_or(0) as i32;
    let next = (current + quarter_turns_to_degrees(quarter_turns)?).rem_euclid(360);
    page_dict.set("Rotate", int(next as i64));
    Ok(())
}

pub fn prepare_pdf_page_doc(mut doc: PdfDoc, page_num: u32, quarter_turns: u8) -> Result<PdfDoc> {
    let all_pages: Vec<u32> = doc.get_pages().keys().copied().collect();
    let total = all_pages.len() as u32;
    if page_num == 0 || page_num > total {
        bail!("Pagina {page_num} non esiste ({total} pagine totali)");
    }

    if quarter_turns != 0 {
        apply_pdf_rotation(&mut doc, page_num, quarter_turns)?;
    }

    let to_delete: Vec<u32> = all_pages
        .into_iter()
        .filter(|candidate| *candidate != page_num)
        .collect();
    if !to_delete.is_empty() {
        doc.delete_pages(&to_delete);
    }
    Ok(doc)
}

pub fn count_pages(path: &str) -> Result<u32> {
    Ok(PdfDoc::load(path)?.get_pages().len() as u32)
}

pub fn merge_pdf_documents(mut docs: Vec<PdfDoc>) -> Result<PdfDoc> {
    let mut base = docs.remove(0);

    let base_pages_id = base
        .catalog()?
        .get(b"Pages")
        .and_then(|obj| obj.as_reference())
        .context("Pages non trovato nel catalog")?;

    let mut offset = base.max_id + 1;
    let offsets: Vec<u32> = docs.iter().map(|doc| {
        let current = offset;
        offset += doc.max_id + 1;
        current
    }).collect();

    docs.par_iter_mut()
        .zip(offsets.par_iter())
        .for_each(|(doc, &current_offset)| doc.renumber_objects_with(current_offset));

    for other in docs {
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

        let pages_dict = base.get_dictionary_mut(base_pages_id)?;
        let current_count = pages_dict
            .get(b"Count")
            .and_then(|obj| obj.as_i64())
            .unwrap_or(0);

        {
            let kids_obj = pages_dict.get_mut(b"Kids")?;
            if let Object::Array(kids) = kids_obj {
                kids.extend(other_page_ids.iter().map(|&id| Object::Reference(id)));
            }
        }

        pages_dict.set("Count", int(current_count + other_page_ids.len() as i64));
    }

    Ok(base)
}
