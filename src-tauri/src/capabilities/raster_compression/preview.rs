use std::fs::File;
use std::io::BufReader;
use std::path::Path;

use anyhow::{Context, Result};
use image::{DynamicImage, RgbImage, RgbaImage};
use jpeg_decoder::{Decoder as JpegDecoder, PixelFormat};

use super::source::{
    image_decode_guard, load_source_image_unlocked, read_webp_bytes, validate_image_dimensions,
    validate_source_image_file_size,
};
use super::{
    encode_jpeg, flatten_to_white_rgb, validate_raster_layout, JpegColor, Raster,
    MAX_RASTER_DECODE_BYTES,
};

const IMAGE_PREVIEW_JPEG_QUALITY: u8 = 86;

fn preview_dimensions(width: u32, height: u32, max_long_side: u32) -> Option<(u32, u32)> {
    let long_side = width.max(height);
    if long_side <= max_long_side {
        return None;
    }

    let next_width =
        ((u64::from(width) * u64::from(max_long_side)) / u64::from(long_side)).max(1) as u32;
    let next_height =
        ((u64::from(height) * u64::from(max_long_side)) / u64::from(long_side)).max(1) as u32;
    Some((next_width, next_height))
}

fn target_dimensions(width: u32, height: u32, max_long_side: u32) -> (u32, u32) {
    preview_dimensions(width, height, max_long_side).unwrap_or((width, height))
}

fn resize_rgb(image: RgbImage, dimensions: (u32, u32)) -> Result<RgbImage> {
    if image.dimensions() == dimensions {
        return Ok(image);
    }
    let raster = Raster::from_rgb_image(image).resize(Some(dimensions))?;
    RgbImage::from_raw(raster.width(), raster.height(), raster.into_data())
        .context("create resized image preview")
}

fn grayscale_to_rgb(data: &[u8]) -> Vec<u8> {
    let mut rgb = Vec::with_capacity(data.len().saturating_mul(3));
    for value in data {
        rgb.extend_from_slice(&[*value, *value, *value]);
    }
    rgb
}

fn cmyk_to_rgb(data: &[u8]) -> Vec<u8> {
    let mut rgb = Vec::with_capacity(data.len().saturating_sub(data.len() / 4));
    let (pixels, _) = data.as_chunks::<4>();
    for pixel in pixels {
        let inverse_black = u16::from(255 - pixel[3]);
        let convert =
            |channel: u8| (((u16::from(255 - channel) * inverse_black) + 127) / 255) as u8;
        rgb.extend_from_slice(&[convert(pixel[0]), convert(pixel[1]), convert(pixel[2])]);
    }
    rgb
}

fn jpeg_pixels_to_rgb(
    data: Vec<u8>,
    width: u32,
    height: u32,
    format: PixelFormat,
) -> Result<RgbImage> {
    let rgb = match format {
        PixelFormat::L8 => grayscale_to_rgb(&data),
        PixelFormat::RGB24 => data,
        PixelFormat::CMYK32 => cmyk_to_rgb(&data),
        PixelFormat::L16 => anyhow::bail!("16-bit grayscale JPEG previews are not supported"),
    };
    RgbImage::from_raw(width, height, rgb).context("create decoded JPEG preview")
}

fn decode_jpeg_at_native_scale(path: &str, max_long_side: u32) -> Result<(RgbImage, (u32, u32))> {
    validate_source_image_file_size(path)?;
    let file = File::open(path).context("open JPEG preview")?;
    let mut decoder = JpegDecoder::new(BufReader::new(file));
    decoder.set_max_decoding_buffer_size(MAX_RASTER_DECODE_BYTES as usize);
    decoder.read_info().context("read JPEG preview metadata")?;
    let source = decoder.info().context("JPEG preview metadata missing")?;
    let source_dimensions = (u32::from(source.width), u32::from(source.height));
    validate_image_dimensions(source_dimensions.0, source_dimensions.1)?;
    let target = target_dimensions(source_dimensions.0, source_dimensions.1, max_long_side);
    if target != source_dimensions {
        decoder
            .scale(
                target.0.min(u32::from(u16::MAX)) as u16,
                target.1.min(u32::from(u16::MAX)) as u16,
            )
            .context("scale JPEG while decoding preview")?;
    }

    let data = decoder.decode().context("decode JPEG preview")?;
    let decoded = decoder.info().context("decoded JPEG metadata missing")?;
    let dimensions = (u32::from(decoded.width), u32::from(decoded.height));
    validate_raster_layout(
        dimensions.0,
        dimensions.1,
        decoded.pixel_format.pixel_bytes(),
    )?;
    let image = jpeg_pixels_to_rgb(data, dimensions.0, dimensions.1, decoded.pixel_format)?;
    Ok((image, target))
}

fn decode_jpeg_preview(path: &str, max_long_side: u32) -> Result<RgbImage> {
    let (image, target) = decode_jpeg_at_native_scale(path, max_long_side)?;
    resize_rgb(image, target)
}

fn decode_webp_preview(path: &str, max_long_side: u32) -> Result<RgbImage> {
    let bytes = read_webp_bytes(path)?;
    let info = webpx::ImageInfo::from_webp(&bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
    validate_image_dimensions(info.width, info.height)?;
    let target = target_dimensions(info.width, info.height, max_long_side);
    let decoder = webpx::Decoder::new(&bytes)
        .map_err(|error| anyhow::anyhow!("{error}"))?
        .scale(target.0, target.1);

    let image = if info.has_alpha {
        let (pixels, width, height) = decoder
            .decode_rgba_raw()
            .map_err(|error| anyhow::anyhow!("{error}"))?;
        let rgba =
            RgbaImage::from_raw(width, height, pixels).context("create decoded WebP preview")?;
        DynamicImage::ImageRgba8(rgba)
    } else {
        let (pixels, width, height) = decoder
            .decode_rgb_raw()
            .map_err(|error| anyhow::anyhow!("{error}"))?;
        let rgb =
            RgbImage::from_raw(width, height, pixels).context("create decoded WebP preview")?;
        DynamicImage::ImageRgb8(rgb)
    };
    validate_raster_layout(
        image.width(),
        image.height(),
        if info.has_alpha { 4 } else { 3 },
    )?;
    Ok(flatten_to_white_rgb(image))
}

fn decode_generic_preview(path: &str, max_long_side: u32) -> Result<RgbImage> {
    let (image, descriptor) = load_source_image_unlocked(path)?;
    let target = target_dimensions(descriptor.width, descriptor.height, max_long_side);
    resize_rgb(flatten_to_white_rgb(image), target)
}

fn extension(path: &str) -> String {
    Path::new(path)
        .extension()
        .and_then(|value| value.to_str())
        .unwrap_or_default()
        .to_ascii_lowercase()
}

/// Generates a bounded JPEG display preview using the most efficient decoder for the source.
pub(crate) fn generate_image_preview(path: &str, max_long_side: u32) -> Result<Vec<u8>> {
    anyhow::ensure!(
        max_long_side > 0,
        "image preview dimensions must be positive"
    );
    let _guard = image_decode_guard();
    let rgb = match extension(path).as_str() {
        "jpg" | "jpeg" => decode_jpeg_preview(path, max_long_side)
            .or_else(|_| decode_generic_preview(path, max_long_side))?,
        "webp" => decode_webp_preview(path, max_long_side)?,
        _ => decode_generic_preview(path, max_long_side)?,
    };
    encode_jpeg(
        rgb.as_raw(),
        rgb.width(),
        rgb.height(),
        JpegColor::Rgb,
        IMAGE_PREVIEW_JPEG_QUALITY,
    )
    .context("encode image preview")
}

#[cfg(test)]
mod tests {
    use std::fs;

    use image::GenericImageView;

    use super::{
        cmyk_to_rgb, decode_jpeg_at_native_scale, generate_image_preview, grayscale_to_rgb,
    };
    use crate::capabilities::raster_compression::{encode_jpeg, JpegColor};

    #[test]
    fn jpeg_preview_uses_native_decoder_reduction_before_exact_resize() -> anyhow::Result<()> {
        let path =
            std::env::temp_dir().join(format!("fyler-jpeg-preview-{}.jpg", uuid::Uuid::new_v4()));
        let encoded = encode_jpeg(&vec![128; 3200 * 800 * 3], 3200, 800, JpegColor::Rgb, 90)?;
        fs::write(&path, encoded)?;

        let (decoded, target) = decode_jpeg_at_native_scale(&path.to_string_lossy(), 96)?;
        assert_eq!(target, (96, 24));
        assert_eq!(decoded.dimensions(), (400, 100));
        let preview = generate_image_preview(&path.to_string_lossy(), 96)?;
        assert_eq!(image::load_from_memory(&preview)?.dimensions(), (96, 24));

        let _ = fs::remove_file(path);
        Ok(())
    }

    #[test]
    fn webp_preview_decodes_directly_to_requested_dimensions() -> anyhow::Result<()> {
        let path =
            std::env::temp_dir().join(format!("fyler-webp-preview-{}.webp", uuid::Uuid::new_v4()));
        let encoded = webpx::EncoderConfig::new()
            .quality(90.0)
            .encode_rgb(&vec![90; 800 * 400 * 3], 800, 400, webpx::Unstoppable)
            .map_err(|error| anyhow::anyhow!("{error}"))?;
        fs::write(&path, encoded)?;

        let preview = generate_image_preview(&path.to_string_lossy(), 96)?;
        assert_eq!(image::load_from_memory(&preview)?.dimensions(), (96, 48));

        let _ = fs::remove_file(path);
        Ok(())
    }

    #[test]
    fn jpeg_preview_normalizes_grayscale_and_cmyk_pixels_to_rgb() {
        assert_eq!(
            grayscale_to_rgb(&[0, 128, 255]),
            [0, 0, 0, 128, 128, 128, 255, 255, 255]
        );
        assert_eq!(cmyk_to_rgb(&[0, 0, 0, 0]), [255, 255, 255]);
        assert_eq!(cmyk_to_rgb(&[255, 0, 0, 0]), [0, 255, 255]);
        assert_eq!(cmyk_to_rgb(&[0, 0, 0, 255]), [0, 0, 0]);
    }
}
