use anyhow::Result;
use lopdf::{Document as PdfDoc, Object, ObjectId};

use crate::models::OptimizeOptions;
use crate::pdf_image::{decide_image_embed, load_source_image, prepare_pdf_image};

use super::layout::compute_image_export_layout;
use super::rotate::rotate_dynamic_image;

fn name(s: &[u8]) -> Object {
    Object::Name(s.to_vec())
}

fn int(n: i64) -> Object {
    Object::Integer(n)
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
    let (img, descriptor) = load_source_image(path)?;
    let img = rotate_dynamic_image(img, quarter_turns)?;
    let prepared = prepare_pdf_image(img, decide_image_embed(&descriptor, optimize))?;
    append_prepared_image_as_page(doc, image_fit, prepared)
}
