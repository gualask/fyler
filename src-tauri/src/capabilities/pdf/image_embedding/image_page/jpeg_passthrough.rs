use jpeg_decoder::PixelFormat;
use lopdf::{Document as PdfDoc, ObjectId};
use std::io::BufReader;

use super::{append_image_xobject_as_page, resize_to_target_dpi, EmbeddedImageXObject};
use crate::capabilities::pdf::image_embedding::{
    layout::compute_image_export_layout, rotate::rotated_dimensions, source_image_dimensions,
    source_image_requires_orientation, ImageEmbeddingOptions, ImageFit, QuarterTurn,
};

struct JpegPassthroughInfo {
    width_px: u32,
    height_px: u32,
    color_space: &'static [u8],
}

fn can_embed_original_jpeg(path: &str, optimize: Option<&ImageEmbeddingOptions>) -> bool {
    let lower = path.to_ascii_lowercase();
    let is_jpeg = lower.ends_with(".jpg") || lower.ends_with(".jpeg");
    is_jpeg
        && optimize.and_then(|value| value.jpeg_quality).is_none()
        && matches!(source_image_requires_orientation(path), Ok(false))
}

fn read_jpeg_passthrough_info(path: &str) -> Option<JpegPassthroughInfo> {
    let file = std::fs::File::open(path).ok()?;
    let mut decoder = jpeg_decoder::Decoder::new(BufReader::new(file));
    decoder.read_info().ok()?;
    let info = decoder.info()?;

    Some(JpegPassthroughInfo {
        width_px: u32::from(info.width),
        height_px: u32::from(info.height),
        color_space: jpeg_color_space(info.pixel_format)?,
    })
}

fn jpeg_color_space(pixel_format: PixelFormat) -> Option<&'static [u8]> {
    match pixel_format {
        PixelFormat::RGB24 => Some(b"DeviceRGB"),
        PixelFormat::L8 => Some(b"DeviceGray"),
        _ => None,
    }
}

pub(super) fn try_prepare_positioned_jpeg(
    path: &str,
    quarter_turns: QuarterTurn,
    optimize: Option<&ImageEmbeddingOptions>,
    draw_width_pt: f64,
    draw_height_pt: f64,
) -> Option<(EmbeddedImageXObject, QuarterTurn)> {
    if !can_embed_original_jpeg(path, optimize) {
        return None;
    }
    let info = read_jpeg_passthrough_info(path).filter(|info| {
        let (width, height) = rotated_dimensions(info.width_px, info.height_px, quarter_turns);
        resize_to_target_dpi(width, height, optimize, draw_width_pt, draw_height_pt).is_none()
    })?;
    let bytes = std::fs::read(path).ok()?;
    Some((
        EmbeddedImageXObject {
            width_px: info.width_px,
            height_px: info.height_px,
            color_space: info.color_space,
            filter: Some(b"DCTDecode"),
            data: bytes,
        },
        quarter_turns,
    ))
}

pub(super) fn try_append_jpeg_as_page_without_decode(
    doc: &mut PdfDoc,
    path: &str,
    image_fit: ImageFit,
    quarter_turns: QuarterTurn,
    optimize: Option<&ImageEmbeddingOptions>,
) -> Option<ObjectId> {
    if !can_embed_original_jpeg(path, optimize) || source_image_dimensions(path).is_err() {
        return None;
    }

    let info = read_jpeg_passthrough_info(path)?;
    let (rotated_width_px, rotated_height_px) =
        rotated_dimensions(info.width_px, info.height_px, quarter_turns);
    let layout = compute_image_export_layout(rotated_width_px, rotated_height_px, image_fit);
    if resize_to_target_dpi(
        rotated_width_px,
        rotated_height_px,
        optimize,
        layout.draw_width_pt,
        layout.draw_height_pt,
    )
    .is_some()
    {
        return None;
    }

    let bytes = std::fs::read(path).ok()?;
    Some(append_image_xobject_as_page(
        doc,
        layout,
        quarter_turns,
        EmbeddedImageXObject {
            width_px: info.width_px,
            height_px: info.height_px,
            color_space: info.color_space,
            filter: Some(b"DCTDecode"),
            data: bytes,
        },
    ))
}
