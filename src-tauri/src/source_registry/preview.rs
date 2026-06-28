use anyhow::Context;
use image::codecs::jpeg::JpegEncoder;
use image::imageops::FilterType;
use image::{DynamicImage, GenericImageView, Rgb, RgbImage};

use crate::pdf_image::load_source_image;

const IMAGE_PREVIEW_LONG_SIDE: u32 = 1600;
const IMAGE_PREVIEW_JPEG_QUALITY: u8 = 86;

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
/// Compressed display preview for an imported image.
pub struct ImagePreview {
    pub mime_type: String,
    pub bytes: Vec<u8>,
    pub width: u32,
    pub height: u32,
}

fn resize_for_preview(image: DynamicImage) -> DynamicImage {
    let (width, height) = image.dimensions();
    let long_side = width.max(height);
    if long_side <= IMAGE_PREVIEW_LONG_SIDE {
        return image;
    }

    let next_width = ((u64::from(width) * u64::from(IMAGE_PREVIEW_LONG_SIDE))
        / u64::from(long_side))
    .max(1) as u32;
    let next_height = ((u64::from(height) * u64::from(IMAGE_PREVIEW_LONG_SIDE))
        / u64::from(long_side))
    .max(1) as u32;

    image.resize(next_width, next_height, FilterType::Lanczos3)
}

fn flatten_on_white(image: DynamicImage) -> RgbImage {
    let rgba = image.to_rgba8();
    let (width, height) = rgba.dimensions();
    let mut rgb = RgbImage::new(width, height);

    for (x, y, pixel) in rgba.enumerate_pixels() {
        let [red, green, blue, alpha] = pixel.0;
        let alpha = u16::from(alpha);
        let inverse_alpha = 255 - alpha;
        let blend = |channel: u8| -> u8 {
            ((u16::from(channel) * alpha + 255 * inverse_alpha + 127) / 255) as u8
        };
        rgb.put_pixel(x, y, Rgb([blend(red), blend(green), blend(blue)]));
    }

    rgb
}

pub fn make_image_preview(path: &str) -> anyhow::Result<ImagePreview> {
    let (image, _) =
        load_source_image(path).with_context(|| format!("read image preview: {path}"))?;
    let rgb = flatten_on_white(resize_for_preview(image));
    let (width, height) = rgb.dimensions();
    let mut bytes = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut bytes, IMAGE_PREVIEW_JPEG_QUALITY);
    encoder
        .encode_image(&DynamicImage::ImageRgb8(rgb))
        .context("encode image preview")?;

    Ok(ImagePreview {
        mime_type: "image/jpeg".into(),
        bytes,
        width,
        height,
    })
}
