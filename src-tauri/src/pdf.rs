use std::collections::BTreeMap;

use anyhow::{bail, Context, Result};
use image::DynamicImage;
use lopdf::{Document as PdfDoc, Object};

pub const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "tiff", "tif", "webp", "bmp", "ico", "tga", "qoi",
];
const A4_W: f64 = 595.0;
const A4_H: f64 = 842.0;

fn name(s: &[u8]) -> Object { Object::Name(s.to_vec()) }
fn int(n: i64) -> Object { Object::Integer(n) }

#[derive(Debug, Clone, Copy, serde::Serialize)]
pub struct ImageExportPreviewLayout {
    #[serde(rename = "pageWidthPt")]
    pub page_width_pt: f64,
    #[serde(rename = "pageHeightPt")]
    pub page_height_pt: f64,
    #[serde(rename = "drawXPt")]
    pub draw_x_pt: f64,
    #[serde(rename = "drawYPt")]
    pub draw_y_pt: f64,
    #[serde(rename = "drawWidthPt")]
    pub draw_width_pt: f64,
    #[serde(rename = "drawHeightPt")]
    pub draw_height_pt: f64,
    #[serde(rename = "clipToPage")]
    pub clip_to_page: bool,
    #[serde(rename = "fillBackground")]
    pub fill_background: bool,
}

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

fn rotated_dimensions(width_px: u32, height_px: u32, quarter_turns: u8) -> Result<(u32, u32)> {
    Ok(match quarter_turns_to_degrees(quarter_turns)? {
        0 | 180 => (width_px, height_px),
        90 | 270 => (height_px, width_px),
        _ => unreachable!(),
    })
}

fn compute_image_export_layout(width_px: u32, height_px: u32, image_fit: &str) -> ImageExportPreviewLayout {
    let w_pt = width_px as f64 * 72.0 / 96.0;
    let h_pt = height_px as f64 * 72.0 / 96.0;

    match image_fit {
        "contain" => {
            let scale = (A4_W / w_pt).min(A4_H / h_pt);
            let sw = w_pt * scale;
            let sh = h_pt * scale;
            ImageExportPreviewLayout {
                page_width_pt: A4_W.ceil(),
                page_height_pt: A4_H.ceil(),
                draw_x_pt: (A4_W - sw) / 2.0,
                draw_y_pt: (A4_H - sh) / 2.0,
                draw_width_pt: sw,
                draw_height_pt: sh,
                clip_to_page: false,
                fill_background: true,
            }
        }
        "cover" => {
            let scale = (A4_W / w_pt).max(A4_H / h_pt);
            let sw = w_pt * scale;
            let sh = h_pt * scale;
            ImageExportPreviewLayout {
                page_width_pt: A4_W.ceil(),
                page_height_pt: A4_H.ceil(),
                draw_x_pt: (A4_W - sw) / 2.0,
                draw_y_pt: (A4_H - sh) / 2.0,
                draw_width_pt: sw,
                draw_height_pt: sh,
                clip_to_page: true,
                fill_background: false,
            }
        }
        _ => ImageExportPreviewLayout {
            page_width_pt: w_pt.ceil(),
            page_height_pt: h_pt.ceil(),
            draw_x_pt: 0.0,
            draw_y_pt: 0.0,
            draw_width_pt: w_pt.ceil(),
            draw_height_pt: h_pt.ceil(),
            clip_to_page: false,
            fill_background: false,
        },
    }
}

pub fn image_export_preview_layout(
    path: &str,
    image_fit: &str,
    quarter_turns: u8,
) -> Result<ImageExportPreviewLayout> {
    let (width_px, height_px) = image::image_dimensions(path).context("Errore apertura immagine")?;
    let (rotated_width_px, rotated_height_px) = rotated_dimensions(width_px, height_px, quarter_turns)?;
    Ok(compute_image_export_layout(rotated_width_px, rotated_height_px, image_fit))
}

fn image_to_pdf_doc_from_image(img: DynamicImage, image_fit: &str) -> Result<PdfDoc> {
    use lopdf::{Dictionary, Stream};

    let rgb = img.to_rgb8();
    let (width_px, height_px) = rgb.dimensions();
    let img_data = rgb.into_raw();
    let layout = compute_image_export_layout(width_px, height_px, image_fit);
    let page_w = layout.page_width_pt as i64;
    let page_h = layout.page_height_pt as i64;
    let content = if layout.clip_to_page {
        format!(
            "q 0 0 {} {} re W n {:.4} 0 0 {:.4} {:.4} {:.4} cm /Im0 Do Q\n",
            layout.page_width_pt,
            layout.page_height_pt,
            layout.draw_width_pt,
            layout.draw_height_pt,
            layout.draw_x_pt,
            layout.draw_y_pt,
        )
    } else if layout.fill_background {
        format!(
            "1 g 0 0 {} {} re f q {:.4} 0 0 {:.4} {:.4} {:.4} cm /Im0 Do Q\n",
            layout.page_width_pt,
            layout.page_height_pt,
            layout.draw_width_pt,
            layout.draw_height_pt,
            layout.draw_x_pt,
            layout.draw_y_pt,
        )
    } else {
        format!(
            "q {:.4} 0 0 {:.4} {:.4} {:.4} cm /Im0 Do Q\n",
            layout.draw_width_pt,
            layout.draw_height_pt,
            layout.draw_x_pt,
            layout.draw_y_pt,
        )
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
    // `delete_pages` updates the page tree, but leaves the removed pages' objects
    // in the document until they are explicitly pruned.
    doc.prune_objects();
    doc.renumber_objects();
    doc.adjust_zero_pages();
    Ok(doc)
}

pub fn prepare_pdf_subset_doc(mut doc: PdfDoc, pages: &[(u32, u8)]) -> Result<PdfDoc> {
    if pages.is_empty() {
        bail!("Nessuna pagina selezionata");
    }

    let all_pages: Vec<u32> = doc.get_pages().keys().copied().collect();
    let total = all_pages.len() as u32;
    let mut selected = std::collections::BTreeSet::new();
    let mut previous_page = 0;

    for (page_num, quarter_turns) in pages {
        if *page_num == 0 || *page_num > total {
            bail!("Pagina {page_num} non esiste ({total} pagine totali)");
        }
        if *page_num <= previous_page {
            bail!("Le pagine del subset devono essere in ordine crescente senza duplicati");
        }
        previous_page = *page_num;
        selected.insert(*page_num);

        if *quarter_turns != 0 {
            apply_pdf_rotation(&mut doc, *page_num, *quarter_turns)?;
        }
    }

    let to_delete: Vec<u32> = all_pages
        .into_iter()
        .filter(|candidate| !selected.contains(candidate))
        .collect();
    if !to_delete.is_empty() {
        doc.delete_pages(&to_delete);
    }

    doc.prune_objects();
    doc.renumber_objects();
    doc.adjust_zero_pages();
    Ok(doc)
}

pub fn count_pages(path: &str) -> Result<u32> {
    Ok(PdfDoc::load(path)?.get_pages().len() as u32)
}

pub fn merge_pdf_documents(mut docs: Vec<PdfDoc>) -> Result<PdfDoc> {
    let mut document = PdfDoc::with_version("1.5");
    let mut documents_pages = BTreeMap::new();
    let mut documents_objects = BTreeMap::new();
    let mut max_id = 1;

    for mut doc in docs.drain(..) {
        doc.renumber_objects_with(max_id);
        max_id = doc.max_id + 1;

        for object_id in doc.page_iter() {
            documents_pages.insert(object_id, doc.get_object(object_id)?.to_owned());
        }

        documents_objects.extend(doc.objects);
    }

    let mut catalog_object: Option<(lopdf::ObjectId, Object)> = None;
    let mut pages_object: Option<(lopdf::ObjectId, Object)> = None;

    for (object_id, object) in documents_objects {
        match object.type_name().unwrap_or(b"") {
            b"Catalog" => {
                catalog_object = Some((
                    catalog_object.as_ref().map(|(id, _)| *id).unwrap_or(object_id),
                    object,
                ));
            }
            b"Pages" => {
                if let Ok(dictionary) = object.as_dict() {
                    let mut dictionary = dictionary.clone();
                    if let Some((_, existing)) = &pages_object {
                        if let Ok(old_dictionary) = existing.as_dict() {
                            dictionary.extend(old_dictionary);
                        }
                    }

                    pages_object = Some((
                        pages_object.as_ref().map(|(id, _)| *id).unwrap_or(object_id),
                        Object::Dictionary(dictionary),
                    ));
                }
            }
            b"Page" | b"Outlines" | b"Outline" => {}
            _ => {
                document.objects.insert(object_id, object);
            }
        }
    }

    let (catalog_id, catalog_object) = catalog_object.context("Catalog root not found")?;
    let (pages_id, pages_object) = pages_object.context("Pages root not found")?;

    for (object_id, object) in &documents_pages {
        if let Ok(dictionary) = object.as_dict() {
            let mut dictionary = dictionary.clone();
            dictionary.set("Parent", pages_id);
            document.objects.insert(*object_id, Object::Dictionary(dictionary));
        }
    }

    if let Ok(dictionary) = pages_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Count", documents_pages.len() as u32);
        dictionary.set(
            "Kids",
            documents_pages
                .keys()
                .map(|object_id| Object::Reference(*object_id))
                .collect::<Vec<_>>(),
        );
        document.objects.insert(pages_id, Object::Dictionary(dictionary));
    }

    if let Ok(dictionary) = catalog_object.as_dict() {
        let mut dictionary = dictionary.clone();
        dictionary.set("Pages", pages_id);
        dictionary.remove(b"Outlines");
        document.objects.insert(catalog_id, Object::Dictionary(dictionary));
    }

    document.trailer.set("Root", catalog_id);
    document.max_id = document.objects.len() as u32;
    document.renumber_objects();
    document.adjust_zero_pages();

    Ok(document)
}

#[cfg(test)]
mod tests {
    use super::{
        compute_image_export_layout,
        image_export_preview_layout,
        merge_pdf_documents,
        prepare_pdf_page_doc,
        prepare_pdf_subset_doc,
    };
    use anyhow::Context;
    use image::RgbImage;
    use lopdf::Document as PdfDoc;
    use std::fs::{self, File};
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn repo_fixture(name: &str) -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .parent()
            .expect("workspace root")
            .join(name)
    }

    fn page_tree_stats(doc: &PdfDoc) -> anyhow::Result<(usize, i64)> {
        let pages_id = doc.catalog()?.get(b"Pages")?.as_reference()?;
        let pages = doc.get_dictionary(pages_id)?;
        let kids = pages.get(b"Kids")?.as_array()?;
        let count = pages.get(b"Count")?.as_i64()?;

        for kid in kids {
            let kid_id = kid.as_reference()?;
            doc.get_dictionary(kid_id)
                .with_context(|| format!("Missing page tree child {:?}", kid_id))?;
        }

        Ok((kids.len(), count))
    }

    fn temp_output_path(label: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "fyler-{}-{}.pdf",
            label,
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos()
        ))
    }

    fn save_doc_classic_for_test(doc: &mut PdfDoc, label: &str) -> anyhow::Result<PathBuf> {
        let output = temp_output_path(label);
        let mut file = File::create(&output).with_context(|| format!("create temp output {label}"))?;
        doc.compress();
        doc.save_to(&mut file)
            .with_context(|| format!("save temp output {label}"))?;
        drop(file);
        Ok(output)
    }

    fn remove_temp_output(path: &Path) {
        let _ = fs::remove_file(path);
    }

    #[test]
    fn prepare_and_merge_preserves_valid_page_tree_for_fisio_fixture() -> anyhow::Result<()> {
        let fixture = repo_fixture("fisio.pdf");
        if !fixture.exists() {
            return Ok(());
        }
        let source_doc = PdfDoc::load(&fixture).context("load fixture")?;
        let mut docs = Vec::new();

        for page_num in 2..=15 {
            let mut doc = prepare_pdf_page_doc(source_doc.clone(), page_num, 0)
                .with_context(|| format!("prepare page {page_num}"))?;
            let output = save_doc_classic_for_test(&mut doc, &format!("prepared-page-{page_num}"))
                .unwrap_or_else(|error| panic!("prepared page {page_num} failed to save: {error:#}"));
            remove_temp_output(&output);
            docs.push(doc);
        }

        let mut merged = merge_pdf_documents(docs).context("merge docs")?;
        let output = save_doc_classic_for_test(&mut merged, "fisio-regression")
            .unwrap_or_else(|error| panic!("merged document failed to save: {error:#}"));

        let output_doc = PdfDoc::load(&output).context("reload merged output")?;
        let output_size = fs::metadata(&output)?.len();
        let input_size = fs::metadata(&fixture)?.len();
        let visible_pages = output_doc.get_pages().len();
        let (kids_len, count) = page_tree_stats(&output_doc)?;

        remove_temp_output(&output);

        assert_eq!(visible_pages, 14, "saved output should expose 14 pages");
        assert_eq!(kids_len, 14, "page tree should have 14 kids");
        assert_eq!(count, 14, "page tree /Count should match the visible pages");
        assert!(
            output_size < input_size * 2,
            "merged output unexpectedly inflated: input={} output={}",
            input_size,
            output_size
        );

        Ok(())
    }

    #[test]
    fn subset_export_of_fisio_fixture_stays_compact_and_valid() -> anyhow::Result<()> {
        let fixture = repo_fixture("fisio.pdf");
        if !fixture.exists() {
            return Ok(());
        }
        let mut doc = prepare_pdf_subset_doc(
            PdfDoc::load(&fixture).context("load fixture")?,
            &(2..=15).map(|page_num| (page_num, 0)).collect::<Vec<_>>(),
        )?;

        let output = save_doc_classic_for_test(&mut doc, "fisio-subset")
            .unwrap_or_else(|error| panic!("subset export failed to save: {error:#}"));

        let output_doc = PdfDoc::load(&output).context("reload subset output")?;
        let output_size = fs::metadata(&output)?.len();
        let input_size = fs::metadata(&fixture)?.len();
        let visible_pages = output_doc.get_pages().len();
        let (_, count) = page_tree_stats(&output_doc)?;

        remove_temp_output(&output);

        assert_eq!(visible_pages, 14, "subset output should expose 14 pages");
        assert_eq!(count, 14, "subset page tree /Count should match the visible pages");
        assert!(
            output_size <= input_size + (input_size / 10),
            "subset output unexpectedly inflated: input={} output={}",
            input_size,
            output_size
        );

        Ok(())
    }

    #[test]
    fn contain_layout_uses_a4_and_centers_image() {
        let layout = compute_image_export_layout(1000, 500, "contain");
        assert_eq!(layout.page_width_pt, 595.0);
        assert_eq!(layout.page_height_pt, 842.0);
        assert!(layout.draw_x_pt.abs() < 0.0001);
        assert!(layout.draw_y_pt > 0.0);
        assert!(layout.fill_background);
        assert!(!layout.clip_to_page);
    }

    #[test]
    fn rotated_image_preview_layout_matches_swapped_dimensions() -> anyhow::Result<()> {
        let path = std::env::temp_dir().join("fyler-rotated-preview-layout.png");
        RgbImage::new(800, 400).save(&path)?;

        let layout = image_export_preview_layout(path.to_string_lossy().as_ref(), "fit", 1)?;

        assert_eq!(layout.page_width_pt, 300.0);
        assert_eq!(layout.page_height_pt, 600.0);
        let _ = fs::remove_file(path);
        Ok(())
    }
}
