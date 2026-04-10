use anyhow::Result;
use image::GenericImageView;
use jpeg_decoder::PixelFormat;
use lopdf::{Document as PdfDoc, Object, ObjectId};
use std::io::BufReader;

use crate::models::OptimizeOptions;
use crate::pdf_image::{decide_image_embed, load_source_image, prepare_pdf_image};

use super::layout::compute_image_export_layout;
use super::rotate::{rotate_dynamic_image, rotated_dimensions};

fn name(s: &[u8]) -> Object {
    Object::Name(s.to_vec())
}

fn int(n: i64) -> Object {
    Object::Integer(n)
}

struct EmbeddedImageXObject {
    width_px: u32,
    height_px: u32,
    color_space: &'static [u8],
    filter: Option<&'static [u8]>,
    data: Vec<u8>,
}

fn build_image_content_stream(
    layout: super::layout::ImageExportPreviewLayout,
    quarter_turns: u8,
) -> Result<String> {
    let (a, b, c, d, e, f) = match crate::pdf::quarter_turns_to_degrees(quarter_turns)? {
        0 => (
            layout.draw_width_pt,
            0.0,
            0.0,
            layout.draw_height_pt,
            layout.draw_x_pt,
            layout.draw_y_pt,
        ),
        90 => (
            0.0,
            -layout.draw_height_pt,
            layout.draw_width_pt,
            0.0,
            layout.draw_x_pt,
            layout.draw_y_pt + layout.draw_height_pt,
        ),
        180 => (
            -layout.draw_width_pt,
            0.0,
            0.0,
            -layout.draw_height_pt,
            layout.draw_x_pt + layout.draw_width_pt,
            layout.draw_y_pt + layout.draw_height_pt,
        ),
        270 => (
            0.0,
            layout.draw_height_pt,
            -layout.draw_width_pt,
            0.0,
            layout.draw_x_pt + layout.draw_width_pt,
            layout.draw_y_pt,
        ),
        _ => unreachable!(),
    };

    Ok(if layout.clip_to_page {
        format!(
            "q 0 0 {} {} re W n {:.4} {:.4} {:.4} {:.4} {:.4} {:.4} cm /Im0 Do Q\n",
            layout.page_width_pt, layout.page_height_pt, a, b, c, d, e, f,
        )
    } else if layout.fill_background {
        format!(
            "1 g 0 0 {} {} re f q {:.4} {:.4} {:.4} {:.4} {:.4} {:.4} cm /Im0 Do Q\n",
            layout.page_width_pt, layout.page_height_pt, a, b, c, d, e, f,
        )
    } else {
        format!(
            "q {:.4} {:.4} {:.4} {:.4} {:.4} {:.4} cm /Im0 Do Q\n",
            a, b, c, d, e, f,
        )
    })
}

fn append_image_xobject_as_page(
    doc: &mut PdfDoc,
    layout: super::layout::ImageExportPreviewLayout,
    quarter_turns: u8,
    xobject: EmbeddedImageXObject,
) -> Result<ObjectId> {
    use lopdf::{Dictionary, Stream};

    let page_w = layout.page_width_pt as i64;
    let page_h = layout.page_height_pt as i64;
    let content = build_image_content_stream(layout, quarter_turns)?;

    let mut img_dict = Dictionary::new();
    img_dict.set("Type", name(b"XObject"));
    img_dict.set("Subtype", name(b"Image"));
    // Marker used by the PDF optimizer to skip re-processing imported image pages.
    img_dict.set("FylerImportedImage", Object::Boolean(true));
    img_dict.set("Width", int(xobject.width_px as i64));
    img_dict.set("Height", int(xobject.height_px as i64));
    img_dict.set("ColorSpace", name(xobject.color_space));
    img_dict.set("BitsPerComponent", int(8));
    if let Some(filter) = xobject.filter {
        img_dict.set("Filter", name(filter));
    }
    let img_id = doc.add_object(Stream::new(img_dict, xobject.data));

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

/// Appends an image file as a new PDF page.
///
/// This loads the image from disk, applies rotation, chooses an embedding strategy (optionally
/// informed by `optimize`), then writes a single-page PDF representation into `doc`.
pub fn append_image_as_page(
    doc: &mut PdfDoc,
    path: &str,
    image_fit: &str,
    quarter_turns: u8,
    optimize: Option<&OptimizeOptions>,
) -> Result<ObjectId> {
    if let Some(page_id) =
        try_append_jpeg_as_page_without_decode(doc, path, image_fit, quarter_turns, optimize)?
    {
        return Ok(page_id);
    }

    let (img, descriptor) = load_source_image(path)?;
    let img = rotate_dynamic_image(img, quarter_turns)?;

    let (source_width_px, source_height_px) = img.dimensions();
    let layout = compute_image_export_layout(source_width_px, source_height_px, image_fit);
    let resize_to = resize_to_target_dpi(source_width_px, source_height_px, optimize, &layout);

    let decision = decide_image_embed(&descriptor, optimize);
    let prepared = prepare_pdf_image(img, decision, resize_to)?;
    let page_id = append_image_xobject_as_page(
        doc,
        layout,
        0,
        EmbeddedImageXObject {
            width_px: prepared.width,
            height_px: prepared.height,
            color_space: b"DeviceRGB",
            filter: prepared.filter,
            data: prepared.data,
        },
    )?;

    Ok(page_id)
}

fn try_append_jpeg_as_page_without_decode(
    doc: &mut PdfDoc,
    path: &str,
    image_fit: &str,
    quarter_turns: u8,
    optimize: Option<&OptimizeOptions>,
) -> Result<Option<ObjectId>> {
    let lower = path.to_ascii_lowercase();
    if !(lower.ends_with(".jpg") || lower.ends_with(".jpeg")) {
        return Ok(None);
    }

    if optimize.and_then(|value| value.jpeg_quality).is_some() {
        return Ok(None);
    }

    let file = match std::fs::File::open(path) {
        Ok(file) => file,
        Err(_) => return Ok(None),
    };
    let mut decoder = jpeg_decoder::Decoder::new(BufReader::new(file));
    if decoder.read_info().is_err() {
        return Ok(None);
    }
    let Some(info) = decoder.info() else {
        return Ok(None);
    };

    let color_space: &'static [u8] = match info.pixel_format {
        PixelFormat::RGB24 => b"DeviceRGB",
        PixelFormat::L8 => b"DeviceGray",
        _ => return Ok(None),
    };

    let width_px = u32::from(info.width);
    let height_px = u32::from(info.height);
    let (rotated_width_px, rotated_height_px) =
        rotated_dimensions(width_px, height_px, quarter_turns)?;
    let layout = compute_image_export_layout(rotated_width_px, rotated_height_px, image_fit);
    let resize_to = resize_to_target_dpi(rotated_width_px, rotated_height_px, optimize, &layout);
    if resize_to.is_some() {
        return Ok(None);
    }

    let bytes = match std::fs::read(path) {
        Ok(bytes) => bytes,
        Err(_) => return Ok(None),
    };

    let page_id = append_image_xobject_as_page(
        doc,
        layout,
        quarter_turns,
        EmbeddedImageXObject {
            width_px,
            height_px,
            color_space,
            filter: Some(b"DCTDecode"),
            data: bytes,
        },
    )?;
    Ok(Some(page_id))
}

fn resize_to_target_dpi(
    source_width_px: u32,
    source_height_px: u32,
    optimize: Option<&OptimizeOptions>,
    layout: &super::layout::ImageExportPreviewLayout,
) -> Option<(u32, u32)> {
    let target_dpi = optimize.and_then(|value| value.target_dpi)?;
    let desired_width = ((layout.draw_width_pt / 72.0) * f64::from(target_dpi)).round() as i64;
    let desired_height = ((layout.draw_height_pt / 72.0) * f64::from(target_dpi)).round() as i64;
    if desired_width <= 0 || desired_height <= 0 {
        return None;
    }

    let width = desired_width as u32;
    let height = desired_height as u32;

    if width == source_width_px && height == source_height_px {
        return None;
    }

    // Only downscale during export; upscaling is slow and reduces quality.
    if width > source_width_px || height > source_height_px {
        return None;
    }

    Some((width, height))
}
