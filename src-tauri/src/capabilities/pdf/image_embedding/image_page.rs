use anyhow::Result;
use image::GenericImageView;
use lopdf::{Document as PdfDoc, Object, ObjectId};

use super::{
    decide_image_embed, prepare_pdf_image, with_source_image, ImageEmbeddingOptions, ImageFit,
    QuarterTurn,
};

use super::layout::compute_image_export_layout;
use super::rotate::rotate_dynamic_image;

mod jpeg_passthrough;
use jpeg_passthrough::{try_append_jpeg_as_page_without_decode, try_prepare_positioned_jpeg};

fn name(s: &[u8]) -> Object {
    Object::Name(s.to_vec())
}

fn int(n: i64) -> Object {
    Object::Integer(n)
}

pub(super) struct EmbeddedImageXObject {
    pub(super) width_px: u32,
    pub(super) height_px: u32,
    pub(super) color_space: &'static [u8],
    pub(super) filter: Option<&'static [u8]>,
    pub(super) data: Vec<u8>,
}

fn build_image_content_stream(
    layout: super::layout::ImageExportPreviewLayout,
    quarter_turns: QuarterTurn,
) -> String {
    let (a, b, c, d, e, f) = match quarter_turns {
        QuarterTurn::Identity => (
            layout.draw_width_pt,
            0.0,
            0.0,
            layout.draw_height_pt,
            layout.draw_x_pt,
            layout.draw_y_pt,
        ),
        QuarterTurn::Clockwise90 => (
            0.0,
            -layout.draw_height_pt,
            layout.draw_width_pt,
            0.0,
            layout.draw_x_pt,
            layout.draw_y_pt + layout.draw_height_pt,
        ),
        QuarterTurn::HalfTurn => (
            -layout.draw_width_pt,
            0.0,
            0.0,
            -layout.draw_height_pt,
            layout.draw_x_pt + layout.draw_width_pt,
            layout.draw_y_pt + layout.draw_height_pt,
        ),
        QuarterTurn::Clockwise270 => (
            0.0,
            layout.draw_height_pt,
            -layout.draw_width_pt,
            0.0,
            layout.draw_x_pt + layout.draw_width_pt,
            layout.draw_y_pt,
        ),
    };

    if layout.clip_to_page {
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
    }
}

fn append_image_xobject_as_page(
    doc: &mut PdfDoc,
    layout: super::layout::ImageExportPreviewLayout,
    quarter_turns: QuarterTurn,
    xobject: EmbeddedImageXObject,
) -> ObjectId {
    use lopdf::{Dictionary, Stream};

    let page_w = layout.page_width_pt as i64;
    let page_h = layout.page_height_pt as i64;
    let content = build_image_content_stream(layout, quarter_turns);

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
    doc.add_object(Object::Dictionary(page_dict))
}

/// Appends an image file as a new PDF page.
///
/// This loads the image from disk, applies rotation, chooses an embedding strategy (optionally
/// informed by `optimize`), then writes a single-page PDF representation into `doc`.
pub fn append_image_as_page(
    doc: &mut PdfDoc,
    path: &str,
    image_fit: ImageFit,
    quarter_turns: QuarterTurn,
    optimize: Option<&ImageEmbeddingOptions>,
) -> Result<ObjectId> {
    if let Some(page_id) =
        try_append_jpeg_as_page_without_decode(doc, path, image_fit, quarter_turns, optimize)
    {
        return Ok(page_id);
    }

    with_source_image(path, |img, descriptor| {
        let img = rotate_dynamic_image(img, quarter_turns);

        let (source_width_px, source_height_px) = img.dimensions();
        let layout = compute_image_export_layout(source_width_px, source_height_px, image_fit);
        let resize_to = resize_to_target_dpi(
            source_width_px,
            source_height_px,
            optimize,
            layout.draw_width_pt,
            layout.draw_height_pt,
        );

        let decision = decide_image_embed(&descriptor, optimize);
        let prepared = prepare_pdf_image(img, decision, resize_to)?;
        Ok(append_image_xobject_as_page(
            doc,
            layout,
            QuarterTurn::Identity,
            EmbeddedImageXObject {
                width_px: prepared.width,
                height_px: prepared.height,
                color_space: b"DeviceRGB",
                filter: prepared.filter,
                data: prepared.data,
            },
        ))
    })
}

/// Prepares one image for placement on an existing PDF page.
///
/// Compatible JPEGs keep their encoded bytes and return the requested rotation so the caller can
/// express it in the PDF transform matrix. Other formats are decoded, rotated, and prepared as an
/// upright XObject through the same safety and encoding policy used by image-page export.
pub(super) fn prepare_positioned_image(
    path: &str,
    quarter_turns: QuarterTurn,
    optimize: Option<&ImageEmbeddingOptions>,
    draw_width_pt: f64,
    draw_height_pt: f64,
) -> Result<(EmbeddedImageXObject, QuarterTurn)> {
    if let Some(positioned) =
        try_prepare_positioned_jpeg(path, quarter_turns, optimize, draw_width_pt, draw_height_pt)
    {
        return Ok(positioned);
    }

    with_source_image(path, |img, descriptor| {
        let img = rotate_dynamic_image(img, quarter_turns);
        let (source_width_px, source_height_px) = img.dimensions();
        let resize_to = resize_to_target_dpi(
            source_width_px,
            source_height_px,
            optimize,
            draw_width_pt,
            draw_height_pt,
        );
        let decision = decide_image_embed(&descriptor, optimize);
        let prepared = prepare_pdf_image(img, decision, resize_to)?;
        Ok((
            EmbeddedImageXObject {
                width_px: prepared.width,
                height_px: prepared.height,
                color_space: b"DeviceRGB",
                filter: prepared.filter,
                data: prepared.data,
            },
            QuarterTurn::Identity,
        ))
    })
}

fn resize_to_target_dpi(
    source_width_px: u32,
    source_height_px: u32,
    optimize: Option<&ImageEmbeddingOptions>,
    draw_width_pt: f64,
    draw_height_pt: f64,
) -> Option<(u32, u32)> {
    let target_dpi = optimize.and_then(|value| value.target_dpi)?;
    let desired_width = ((draw_width_pt / 72.0) * f64::from(target_dpi)).round() as i64;
    let desired_height = ((draw_height_pt / 72.0) * f64::from(target_dpi)).round() as i64;
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
