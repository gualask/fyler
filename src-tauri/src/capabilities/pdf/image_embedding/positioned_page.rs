use anyhow::{Context, Result};
use lopdf::{Dictionary, Document as PdfDoc, Object, ObjectId, Stream};

use super::image_page::{prepare_positioned_image, EmbeddedImageXObject};
use super::{ImageEmbeddingOptions, QuarterTurn};

#[derive(Debug, Clone, Copy, PartialEq)]
pub struct PdfRect {
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

pub struct PositionedImage<'a> {
    pub path: &'a str,
    pub draw_rect: PdfRect,
    pub clip_rect: Option<PdfRect>,
    pub rotation: QuarterTurn,
    pub options: Option<&'a ImageEmbeddingOptions>,
}

fn real(value: f64) -> Object {
    Object::Real(value as f32)
}

fn image_stream(xobject: EmbeddedImageXObject) -> Stream {
    let mut dictionary = Dictionary::new();
    dictionary.set("Type", Object::Name(b"XObject".to_vec()));
    dictionary.set("Subtype", Object::Name(b"Image".to_vec()));
    dictionary.set("FylerImportedImage", Object::Boolean(true));
    dictionary.set("Width", Object::Integer(i64::from(xobject.width_px)));
    dictionary.set("Height", Object::Integer(i64::from(xobject.height_px)));
    dictionary.set("ColorSpace", Object::Name(xobject.color_space.to_vec()));
    dictionary.set("BitsPerComponent", Object::Integer(8));
    if let Some(filter) = xobject.filter {
        dictionary.set("Filter", Object::Name(filter.to_vec()));
    }
    Stream::new(dictionary, xobject.data)
}

fn image_matrix(rect: PdfRect, rotation: QuarterTurn) -> (f64, f64, f64, f64, f64, f64) {
    match rotation {
        QuarterTurn::Identity => (rect.width, 0.0, 0.0, rect.height, rect.x, rect.y),
        QuarterTurn::Clockwise90 => (
            0.0,
            -rect.height,
            rect.width,
            0.0,
            rect.x,
            rect.y + rect.height,
        ),
        QuarterTurn::HalfTurn => (
            -rect.width,
            0.0,
            0.0,
            -rect.height,
            rect.x + rect.width,
            rect.y + rect.height,
        ),
        QuarterTurn::Clockwise270 => (
            0.0,
            rect.height,
            -rect.width,
            0.0,
            rect.x + rect.width,
            rect.y,
        ),
    }
}

fn image_content(name: &str, image: &PositionedImage<'_>, rotation: QuarterTurn) -> String {
    let (a, b, c, d, e, f) = image_matrix(image.draw_rect, rotation);
    let mut content = String::from("q ");
    if let Some(clip) = image.clip_rect {
        content.push_str(&format!(
            "{:.4} {:.4} {:.4} {:.4} re W n ",
            clip.x, clip.y, clip.width, clip.height
        ));
    }
    content.push_str(&format!(
        "{a:.4} {b:.4} {c:.4} {d:.4} {e:.4} {f:.4} cm /{name} Do Q\n"
    ));
    content
}

/// Appends one page containing independently positioned image XObjects.
///
/// The caller owns page geometry and workflow semantics. This capability only prepares images,
/// applies optional clipping and rotation, and writes the page resources/content stream.
pub fn append_positioned_images_as_page(
    doc: &mut PdfDoc,
    page_width: f64,
    page_height: f64,
    images: &[PositionedImage<'_>],
) -> Result<ObjectId> {
    anyhow::ensure!(
        page_width > 0.0 && page_height > 0.0,
        "invalid page dimensions"
    );
    anyhow::ensure!(!images.is_empty(), "positioned image page requires content");

    let mut xobjects = Dictionary::new();
    let mut content = format!("1 g 0 0 {page_width:.4} {page_height:.4} re f\n");

    for (index, image) in images.iter().enumerate() {
        let name = format!("Im{index}");
        let (xobject, applied_rotation) = prepare_positioned_image(
            image.path,
            image.rotation,
            image.options,
            image.draw_rect.width,
            image.draw_rect.height,
        )
        .with_context(|| format!("prepare positioned image {index}"))?;
        let image_id = doc.add_object(image_stream(xobject));
        xobjects.set(name.as_bytes(), Object::Reference(image_id));
        content.push_str(&image_content(&name, image, applied_rotation));
    }

    let content_id = doc.add_object(Stream::new(Dictionary::new(), content.into_bytes()));
    let mut resources = Dictionary::new();
    resources.set("XObject", Object::Dictionary(xobjects));

    let mut page = Dictionary::new();
    page.set("Type", Object::Name(b"Page".to_vec()));
    page.set(
        "MediaBox",
        Object::Array(vec![
            real(0.0),
            real(0.0),
            real(page_width),
            real(page_height),
        ]),
    );
    page.set("Resources", Object::Dictionary(resources));
    page.set("Contents", Object::Reference(content_id));
    Ok(doc.add_object(Object::Dictionary(page)))
}

#[cfg(test)]
mod tests {
    use super::{image_matrix, prepare_positioned_image, PdfRect};
    use crate::capabilities::pdf::image_embedding::{ImageEmbeddingOptions, QuarterTurn};

    fn jpeg_with_orientation(width: u32, height: u32, orientation: u16) -> anyhow::Result<Vec<u8>> {
        let mut jpeg = crate::capabilities::raster_compression::encode_jpeg(
            &vec![96; (width * height * 3) as usize],
            width,
            height,
            crate::capabilities::raster_compression::JpegColor::Rgb,
            92,
        )?;
        let mut exif = vec![
            b'I', b'I', 42, 0, 8, 0, 0, 0, 1, 0, 0x12, 0x01, 3, 0, 1, 0, 0, 0,
        ];
        exif.extend_from_slice(&orientation.to_le_bytes());
        exif.extend_from_slice(&[0, 0, 0, 0, 0, 0]);
        let mut app1 = b"Exif\0\0".to_vec();
        app1.extend_from_slice(&exif);
        let segment_len = u16::try_from(app1.len() + 2)?;
        let mut oriented = vec![0xff, 0xd8, 0xff, 0xe1];
        oriented.extend_from_slice(&segment_len.to_be_bytes());
        oriented.extend_from_slice(&app1);
        oriented.extend_from_slice(&jpeg.split_off(2));
        Ok(oriented)
    }

    #[test]
    fn clockwise_rotation_anchors_inside_the_draw_rectangle() {
        let matrix = image_matrix(
            PdfRect {
                x: 10.0,
                y: 20.0,
                width: 100.0,
                height: 50.0,
            },
            QuarterTurn::Clockwise90,
        );
        assert_eq!(matrix, (0.0, -50.0, 100.0, 0.0, 10.0, 70.0));
    }

    #[test]
    fn positioned_image_resizes_to_its_drawn_target_dpi() -> anyhow::Result<()> {
        let path = std::env::temp_dir().join(format!(
            "fyler-positioned-image-{}.jpg",
            uuid::Uuid::new_v4()
        ));
        image::RgbImage::from_pixel(1200, 600, image::Rgb([60, 90, 120])).save(&path)?;
        let options = ImageEmbeddingOptions {
            preset: Some(crate::capabilities::raster_compression::CompressionPreset::Compact),
            jpeg_quality: None,
            target_dpi: Some(120),
        };

        let (image, rotation) = prepare_positioned_image(
            &path.to_string_lossy(),
            QuarterTurn::Identity,
            Some(&options),
            360.0,
            180.0,
        )?;

        assert_eq!((image.width_px, image.height_px), (600, 300));
        assert_eq!(rotation, QuarterTurn::Identity);
        let _ = std::fs::remove_file(path);
        Ok(())
    }

    #[test]
    fn positioned_jpeg_with_exif_orientation_uses_normalized_pixels() -> anyhow::Result<()> {
        let path = std::env::temp_dir().join(format!(
            "fyler-positioned-oriented-image-{}.jpg",
            uuid::Uuid::new_v4()
        ));
        std::fs::write(&path, jpeg_with_orientation(4, 2, 6)?)?;

        let (image, rotation) = prepare_positioned_image(
            &path.to_string_lossy(),
            QuarterTurn::Identity,
            None,
            144.0,
            288.0,
        )?;

        assert_eq!((image.width_px, image.height_px), (2, 4));
        assert_eq!(rotation, QuarterTurn::Identity);
        let _ = std::fs::remove_file(path);
        Ok(())
    }
}
