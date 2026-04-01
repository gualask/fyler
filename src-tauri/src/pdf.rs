use anyhow::{Context, Result};
use image::DynamicImage;
use lopdf::{Document as PdfDoc, Object, ObjectId};

use crate::error::UserFacingError;
use crate::models::OptimizeOptions;
use crate::pdf_image::{decide_image_embed, load_source_image, prepare_pdf_image};

pub const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "tiff", "tif", "webp", "bmp", "ico", "tga", "qoi",
];
const A4_W: f64 = 595.0;
const A4_H: f64 = 842.0;

fn name(s: &[u8]) -> Object {
    Object::Name(s.to_vec())
}
fn int(n: i64) -> Object {
    Object::Integer(n)
}

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
        other => Err(anyhow::Error::new(UserFacingError::with_meta(
            "invalid_rotation",
            serde_json::json!({ "value": other }),
        ))),
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

fn compute_image_export_layout(
    width_px: u32,
    height_px: u32,
    image_fit: &str,
) -> ImageExportPreviewLayout {
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
    let (width_px, height_px) = image::image_dimensions(path).context("Failed to open image")?;
    let (rotated_width_px, rotated_height_px) =
        rotated_dimensions(width_px, height_px, quarter_turns)?;
    Ok(compute_image_export_layout(
        rotated_width_px,
        rotated_height_px,
        image_fit,
    ))
}

fn append_prepared_image_as_page(
    doc: &mut PdfDoc,
    image_fit: &str,
    prepared: crate::pdf_image::PreparedPdfImage,
) -> Result<ObjectId> {
    use lopdf::{Dictionary, Stream};

    let width_px = prepared.width;
    let height_px = prepared.height;
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
            layout.draw_width_pt, layout.draw_height_pt, layout.draw_x_pt, layout.draw_y_pt,
        )
    };

    let mut img_dict = Dictionary::new();
    img_dict.set("Type", name(b"XObject"));
    img_dict.set("Subtype", name(b"Image"));
    img_dict.set("Width", int(width_px as i64));
    img_dict.set("Height", int(height_px as i64));
    img_dict.set("ColorSpace", name(b"DeviceRGB"));
    img_dict.set("BitsPerComponent", int(8));
    if let Some(filter) = prepared.filter {
        img_dict.set("Filter", name(filter));
    }
    let img_id = doc.add_object(Stream::new(img_dict, prepared.data));

    let content_id = doc.add_object(Stream::new(Dictionary::new(), content.into_bytes()));

    let mut xobject = Dictionary::new();
    xobject.set("Im0", Object::Reference(img_id));
    let mut resources = Dictionary::new();
    resources.set("XObject", Object::Dictionary(xobject));

    let mut page_dict = lopdf::Dictionary::new();
    page_dict.set("Type", name(b"Page"));
    page_dict.set(
        "MediaBox",
        Object::Array(vec![int(0), int(0), int(page_w), int(page_h)]),
    );
    page_dict.set("Resources", Object::Dictionary(resources));
    page_dict.set("Contents", Object::Reference(content_id));
    let page_id = doc.add_object(Object::Dictionary(page_dict));
    Ok(page_id)
}

pub fn append_image_as_page(
    doc: &mut PdfDoc,
    path: &str,
    image_fit: &str,
    quarter_turns: u8,
    optimize: Option<&OptimizeOptions>,
) -> Result<ObjectId> {
    let (img, descriptor) = load_source_image(path)?;
    let img = rotate_dynamic_image(img, quarter_turns)?;
    let prepared = prepare_pdf_image(img, decide_image_embed(&descriptor, optimize))?;
    append_prepared_image_as_page(doc, image_fit, prepared)
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

pub fn count_pages(path: &str) -> Result<u32> {
    Ok(PdfDoc::load(path)?.get_pages().len() as u32)
}

#[cfg(test)]
mod tests {
    use super::{compute_image_export_layout, image_export_preview_layout};
    use crate::models::OptimizeOptions;
    use crate::pdf_compose::PdfComposer;
    use anyhow::Context;
    use image::{RgbImage, RgbaImage};
    use lopdf::{Document as PdfDoc, Object};
    use std::fs::{self, File};
    use std::path::{Path, PathBuf};
    use std::time::{SystemTime, UNIX_EPOCH};

    fn test_fixture(name: &str) -> PathBuf {
        Path::new(env!("CARGO_MANIFEST_DIR"))
            .join("tests")
            .join("fixtures")
            .join(name)
    }

    fn assert_page_tree_consistent(doc: &PdfDoc) -> anyhow::Result<()> {
        let pages_id = doc.catalog()?.get(b"Pages")?.as_reference()?;
        let pages = doc.get_dictionary(pages_id)?;
        let kids = pages.get(b"Kids")?.as_array()?;
        let count = pages.get(b"Count")?.as_i64()?;

        for kid in kids {
            let kid_id = kid.as_reference()?;
            doc.get_dictionary(kid_id)
                .with_context(|| format!("Missing page tree child {:?}", kid_id))?;
        }

        let visible = doc.get_pages().len();
        anyhow::ensure!(kids.len() == visible, "page tree kids mismatch");
        anyhow::ensure!(count as usize == visible, "page tree /Count mismatch");
        Ok(())
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
        let mut file =
            File::create(&output).with_context(|| format!("create temp output {label}"))?;
        doc.compress();
        doc.save_to(&mut file)
            .with_context(|| format!("save temp output {label}"))?;
        drop(file);
        Ok(output)
    }

    fn remove_temp_output(path: &Path) {
        let _ = fs::remove_file(path);
    }

    fn page_image_filter(doc: &PdfDoc, page_index: usize) -> anyhow::Result<Option<Vec<u8>>> {
        let page_id = *doc
            .get_pages()
            .values()
            .nth(page_index)
            .context("missing page")?;
        let page = doc.get_dictionary(page_id)?;
        let resources = resolve_dict(doc, page.get(b"Resources")?)?;
        let xobject = resolve_dict(doc, resources.get(b"XObject")?)?;
        let image_id = xobject
            .get(b"Im0")?
            .as_reference()
            .context("missing Im0 reference")?;
        let stream = doc.get_object(image_id)?.as_stream()?;

        match stream.dict.get(b"Filter") {
            Ok(Object::Name(name)) => Ok(Some(name.clone())),
            Ok(Object::Array(filters)) => Ok(filters
                .first()
                .and_then(|value| value.as_name().ok())
                .map(|name| name.to_vec())),
            Err(_) => Ok(None),
            Ok(_) => Ok(None),
        }
    }

    fn resolve_dict<'a>(
        doc: &'a PdfDoc,
        object: &'a Object,
    ) -> anyhow::Result<&'a lopdf::Dictionary> {
        match object {
            Object::Dictionary(dict) => Ok(dict),
            Object::Reference(id) => Ok(doc.get_dictionary(*id)?),
            _ => anyhow::bail!("expected dictionary"),
        }
    }

    fn temp_image_path(label: &str, extension: &str) -> PathBuf {
        std::env::temp_dir().join(format!(
            "fyler-image-{}-{}.{}",
            label,
            SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .expect("clock")
                .as_nanos(),
            extension
        ))
    }

    #[test]
    fn composer_export_preserves_valid_page_tree_for_fisio_fixture() -> anyhow::Result<()> {
        let fixture = test_fixture("fisio.pdf");
        let input_size = fs::metadata(&fixture)?.len();
        let source_doc = PdfDoc::load(&fixture).context("load fixture")?;

        let mut composer = PdfComposer::new();
        let mut memo = std::collections::HashMap::new();
        for page_num in 2..=15 {
            composer
                .push_pdf_page(&source_doc, &mut memo, "fisio.pdf", page_num, 0)
                .with_context(|| format!("compose page {page_num}"))?;
        }
        let mut merged = composer.finish().context("finish composition")?;

        let output = save_doc_classic_for_test(&mut merged, "fisio-regression")
            .unwrap_or_else(|error| panic!("merged document failed to save: {error:#}"));

        let output_doc = PdfDoc::load(&output).context("reload merged output")?;
        let output_size = fs::metadata(&output)?.len();
        assert_page_tree_consistent(&output_doc)?;

        remove_temp_output(&output);

        assert_eq!(output_doc.get_pages().len(), 14);
        assert!(
            output_size < input_size * 2,
            "composed output unexpectedly inflated: input={} output={}",
            input_size,
            output_size
        );
        Ok(())
    }

    #[test]
    fn composer_single_page_export_is_smaller_than_full_fixture() -> anyhow::Result<()> {
        let fixture = test_fixture("fisio.pdf");
        let input_size = fs::metadata(&fixture)?.len();
        let source_doc = PdfDoc::load(&fixture).context("load fixture")?;

        let mut composer = PdfComposer::new();
        let mut memo = std::collections::HashMap::new();
        composer.push_pdf_page(&source_doc, &mut memo, "fisio.pdf", 3, 0)?;
        let mut merged = composer.finish().context("finish composition")?;

        let output = save_doc_classic_for_test(&mut merged, "fisio-single-page")
            .unwrap_or_else(|error| panic!("single-page export failed to save: {error:#}"));
        let output_size = fs::metadata(&output)?.len();
        let output_doc = PdfDoc::load(&output).context("reload single-page output")?;

        remove_temp_output(&output);

        assert_eq!(output_doc.get_pages().len(), 1);
        assert!(
            output_size < input_size,
            "single-page output kept too much payload: input={} output={}",
            input_size,
            output_size
        );
        Ok(())
    }

    #[test]
    fn composer_merge_image_and_single_pdf_page_stays_smaller_than_full_fixture(
    ) -> anyhow::Result<()> {
        let fixture = test_fixture("fisio.pdf");

        let input_size = fs::metadata(&fixture)?.len();
        let image_path = std::env::temp_dir().join("fyler-merge-regression-image.png");
        RgbImage::new(800, 400).save(&image_path)?;

        let source_doc = PdfDoc::load(&fixture).context("load fixture")?;
        let mut composer = PdfComposer::new();
        composer.push_image_page(image_path.to_string_lossy().as_ref(), "contain", 0, None)?;
        let mut memo = std::collections::HashMap::new();
        composer.push_pdf_page(&source_doc, &mut memo, "fisio.pdf", 3, 0)?;
        let mut merged = composer.finish().context("finish composition")?;

        let output = save_doc_classic_for_test(&mut merged, "image-plus-single-page")
            .unwrap_or_else(|error| panic!("image+page merge failed to save: {error:#}"));
        let output_size = fs::metadata(&output)?.len();
        let output_doc = PdfDoc::load(&output).context("reload image+page output")?;

        remove_temp_output(&output);
        let _ = fs::remove_file(&image_path);

        assert_eq!(output_doc.get_pages().len(), 2);
        assert!(
            output_size < input_size,
            "image+page merge unexpectedly kept full fixture weight: input={} output={}",
            input_size,
            output_size
        );

        Ok(())
    }

    #[test]
    fn original_jpeg_input_stays_dct_encoded() -> anyhow::Result<()> {
        let path = temp_image_path("original-jpeg", "jpg");
        RgbImage::from_pixel(1200, 800, image::Rgb([96, 132, 184])).save(&path)?;

        let mut composer = PdfComposer::new();
        composer.push_image_page(path.to_string_lossy().as_ref(), "fit", 0, None)?;
        let doc = composer.finish()?;
        let filter = page_image_filter(&doc, 0)?;

        let _ = fs::remove_file(path);

        assert_eq!(filter.as_deref(), Some(b"DCTDecode".as_slice()));
        Ok(())
    }

    #[test]
    fn original_png_input_stays_unfiltered_raw() -> anyhow::Result<()> {
        let path = temp_image_path("original-png", "png");
        RgbImage::from_pixel(1200, 800, image::Rgb([24, 48, 72])).save(&path)?;

        let mut composer = PdfComposer::new();
        composer.push_image_page(path.to_string_lossy().as_ref(), "fit", 0, None)?;
        let doc = composer.finish()?;
        let filter = page_image_filter(&doc, 0)?;

        let _ = fs::remove_file(path);

        assert_eq!(filter, None);
        Ok(())
    }

    #[test]
    fn balanced_png_input_uses_jpeg_encoding() -> anyhow::Result<()> {
        let path = temp_image_path("balanced-png", "png");
        RgbImage::from_pixel(1200, 800, image::Rgb([24, 48, 72])).save(&path)?;

        let mut composer = PdfComposer::new();
        composer.push_image_page(
            path.to_string_lossy().as_ref(),
            "fit",
            0,
            Some(&OptimizeOptions {
                jpeg_quality: None,
                target_dpi: Some(170),
                image_fit: None,
            }),
        )?;
        let doc = composer.finish()?;
        let filter = page_image_filter(&doc, 0)?;

        let _ = fs::remove_file(path);

        assert_eq!(filter.as_deref(), Some(b"DCTDecode".as_slice()));
        Ok(())
    }

    #[test]
    fn balanced_alpha_png_flattens_to_renderable_jpeg_page() -> anyhow::Result<()> {
        let path = temp_image_path("balanced-alpha-png", "png");
        RgbaImage::from_pixel(640, 360, image::Rgba([0, 64, 255, 128])).save(&path)?;

        let mut composer = PdfComposer::new();
        composer.push_image_page(
            path.to_string_lossy().as_ref(),
            "contain",
            0,
            Some(&OptimizeOptions {
                jpeg_quality: None,
                target_dpi: Some(170),
                image_fit: None,
            }),
        )?;
        let mut doc = composer.finish()?;
        let filter = page_image_filter(&doc, 0)?;
        let output = save_doc_classic_for_test(&mut doc, "balanced-alpha-png")
            .unwrap_or_else(|error| panic!("balanced alpha png failed to save: {error:#}"));
        let reloaded = PdfDoc::load(&output)?;

        remove_temp_output(&output);
        let _ = fs::remove_file(path);

        assert_eq!(filter.as_deref(), Some(b"DCTDecode".as_slice()));
        assert_eq!(reloaded.get_pages().len(), 1);
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
