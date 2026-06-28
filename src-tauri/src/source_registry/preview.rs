use anyhow::{Context, Result};
use fast_image_resize::{images::Image, FilterType, PixelType, ResizeAlg, ResizeOptions, Resizer};
use image::codecs::jpeg::JpegEncoder;
use image::{DynamicImage, ExtendedColorType, Rgb, RgbImage};

use crate::pdf_image::load_source_image;

const IMAGE_PREVIEW_LONG_SIDE: u32 = 1600;
const IMAGE_PREVIEW_JPEG_QUALITY: u8 = 86;

/// Compressed JPEG display preview bytes for an imported image.
pub type ImagePreviewBytes = Vec<u8>;

fn preview_dimensions(width: u32, height: u32) -> Option<(u32, u32)> {
    let long_side = width.max(height);
    if long_side <= IMAGE_PREVIEW_LONG_SIDE {
        return None;
    }

    let next_width = ((u64::from(width) * u64::from(IMAGE_PREVIEW_LONG_SIDE))
        / u64::from(long_side))
    .max(1) as u32;
    let next_height = ((u64::from(height) * u64::from(IMAGE_PREVIEW_LONG_SIDE))
        / u64::from(long_side))
    .max(1) as u32;

    Some((next_width, next_height))
}

fn flatten_on_white(image: DynamicImage) -> RgbImage {
    if !image.color().has_alpha() {
        return image.to_rgb8();
    }

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

fn resize_rgb_for_preview(rgb: RgbImage, width: u32, height: u32) -> Result<RgbImage> {
    let src = Image::from_vec_u8(rgb.width(), rgb.height(), rgb.into_raw(), PixelType::U8x3)
        .context("map image preview pixels")?;
    let mut dst = Image::new(width, height, PixelType::U8x3);
    let options = ResizeOptions::new()
        .resize_alg(ResizeAlg::Convolution(FilterType::Lanczos3))
        .use_alpha(false);

    Resizer::new()
        .resize(&src, &mut dst, &options)
        .context("resize image preview")?;

    RgbImage::from_raw(width, height, dst.into_vec()).context("create resized image preview")
}

fn encode_jpeg(rgb: RgbImage) -> Result<ImagePreviewBytes> {
    let (width, height) = rgb.dimensions();
    let mut bytes = Vec::new();
    let mut encoder = JpegEncoder::new_with_quality(&mut bytes, IMAGE_PREVIEW_JPEG_QUALITY);
    encoder
        .encode(rgb.as_raw(), width, height, ExtendedColorType::Rgb8)
        .context("encode image preview")?;
    Ok(bytes)
}

pub fn make_image_preview(path: &str) -> Result<ImagePreviewBytes> {
    let (image, descriptor) =
        load_source_image(path).with_context(|| format!("read image preview: {path}"))?;
    let mut rgb = flatten_on_white(image);

    if let Some((width, height)) = preview_dimensions(descriptor.width, descriptor.height) {
        rgb = resize_rgb_for_preview(rgb, width, height)?;
    }

    encode_jpeg(rgb)
}
