use crate::capabilities::pdf::composition::PdfComposer;
use crate::capabilities::pdf::image_embedding::{
    image_export_preview_layout, ImageEmbeddingOptions, ImageFit, QuarterTurn,
};

use anyhow::Context;
use image::{RgbImage, RgbaImage};
use lopdf::{Document as PdfDoc, Object};
use std::fs::{self, File};
use std::path::{Path, PathBuf};
use std::time::{SystemTime, UNIX_EPOCH};

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

fn page_image_stream_bytes(doc: &PdfDoc, page_index: usize) -> anyhow::Result<Vec<u8>> {
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
    Ok(stream.content.clone())
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
fn original_jpeg_input_stays_dct_encoded() -> anyhow::Result<()> {
    let path = temp_image_path("original-jpeg", "jpg");
    RgbImage::from_pixel(1200, 800, image::Rgb([96, 132, 184])).save(&path)?;

    let mut composer = PdfComposer::new();
    composer.push_image_page(
        path.to_string_lossy().as_ref(),
        ImageFit::Fit,
        QuarterTurn::Identity,
        None,
    )?;
    let doc = composer.finish()?;
    let filter = page_image_filter(&doc, 0)?;

    let _ = fs::remove_file(path);

    assert_eq!(filter.as_deref(), Some(b"DCTDecode".as_slice()));
    Ok(())
}

#[test]
fn original_jpeg_input_embeds_bytes_without_reencode() -> anyhow::Result<()> {
    let path = temp_image_path("original-jpeg-bytes", "jpg");
    RgbImage::from_pixel(1200, 800, image::Rgb([96, 132, 184])).save(&path)?;
    let original_bytes = fs::read(&path)?;

    let mut composer = PdfComposer::new();
    composer.push_image_page(
        path.to_string_lossy().as_ref(),
        ImageFit::Fit,
        QuarterTurn::Identity,
        None,
    )?;
    let doc = composer.finish()?;
    let embedded_bytes = page_image_stream_bytes(&doc, 0)?;

    let _ = fs::remove_file(path);

    assert_eq!(embedded_bytes, original_bytes);
    Ok(())
}

#[test]
fn rotated_jpeg_input_embeds_bytes_without_reencode() -> anyhow::Result<()> {
    let path = temp_image_path("rotated-jpeg-bytes", "jpg");
    RgbImage::from_pixel(1200, 800, image::Rgb([96, 132, 184])).save(&path)?;
    let original_bytes = fs::read(&path)?;

    let mut composer = PdfComposer::new();
    composer.push_image_page(
        path.to_string_lossy().as_ref(),
        ImageFit::Fit,
        QuarterTurn::Clockwise90,
        None,
    )?;
    let doc = composer.finish()?;
    let embedded_bytes = page_image_stream_bytes(&doc, 0)?;

    let _ = fs::remove_file(path);

    assert_eq!(embedded_bytes, original_bytes);
    Ok(())
}

#[test]
fn original_png_input_stays_unfiltered_raw() -> anyhow::Result<()> {
    let path = temp_image_path("original-png", "png");
    RgbImage::from_pixel(1200, 800, image::Rgb([24, 48, 72])).save(&path)?;

    let mut composer = PdfComposer::new();
    composer.push_image_page(
        path.to_string_lossy().as_ref(),
        ImageFit::Fit,
        QuarterTurn::Identity,
        None,
    )?;
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
        ImageFit::Fit,
        QuarterTurn::Identity,
        Some(&ImageEmbeddingOptions {
            preset: Some(crate::capabilities::raster_compression::CompressionPreset::Balanced),
            jpeg_quality: None,
            target_dpi: Some(170),
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
        ImageFit::Contain,
        QuarterTurn::Identity,
        Some(&ImageEmbeddingOptions {
            preset: Some(crate::capabilities::raster_compression::CompressionPreset::Balanced),
            jpeg_quality: None,
            target_dpi: Some(170),
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
fn rotated_image_preview_layout_matches_swapped_dimensions() -> anyhow::Result<()> {
    let path = std::env::temp_dir().join("fyler-rotated-preview-layout.png");
    RgbImage::new(800, 400).save(&path)?;

    let layout = image_export_preview_layout(
        path.to_string_lossy().as_ref(),
        ImageFit::Fit,
        QuarterTurn::Clockwise90,
    )?;

    assert_eq!(layout.page_width_pt, 300.0);
    assert_eq!(layout.page_height_pt, 600.0);
    let _ = fs::remove_file(path);
    Ok(())
}
