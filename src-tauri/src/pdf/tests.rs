use super::image_export_preview_layout;
use super::layout::compute_image_export_layout;

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

fn resolve_dict<'a>(doc: &'a PdfDoc, object: &'a Object) -> anyhow::Result<&'a lopdf::Dictionary> {
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
fn composer_merge_image_and_single_pdf_page_stays_smaller_than_full_fixture() -> anyhow::Result<()>
{
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
