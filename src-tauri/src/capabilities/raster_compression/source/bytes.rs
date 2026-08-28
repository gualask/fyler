use anyhow::{Context, Result};
use image::{
    DynamicImage, GenericImageView, ImageDecoder, ImageFormat, ImageReader, RgbImage, RgbaImage,
};
use std::io::Cursor;

use super::{
    image_decode_guard, image_decode_limits, source_format, validate_image_dimensions,
    validate_source_bytes, SourceImageDescriptor, SourceImageFormat, MAX_RASTER_DECODE_BYTES,
};

fn load_source_image_bytes_unlocked(
    bytes: &[u8],
    format: ImageFormat,
) -> Result<(DynamicImage, SourceImageDescriptor)> {
    validate_source_bytes(bytes, format == ImageFormat::WebP)?;

    if format == ImageFormat::WebP {
        let info = webpx::ImageInfo::from_webp(bytes)
            .map_err(|error| anyhow::anyhow!("failed to inspect WebP: {error}"))?;
        anyhow::ensure!(!info.has_animation, "Animated WebP is not supported");
        validate_image_dimensions(info.width, info.height)?;
        let mut img = if info.has_alpha {
            let (pixels, width, height) =
                webpx::decode_rgba(bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
            DynamicImage::ImageRgba8(
                RgbaImage::from_raw(width, height, pixels)
                    .context("Failed to build RGBA buffer for WebP decode")?,
            )
        } else {
            let (pixels, width, height) =
                webpx::decode_rgb(bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
            DynamicImage::ImageRgb8(
                RgbImage::from_raw(width, height, pixels)
                    .context("Failed to build RGB buffer for WebP decode")?,
            )
        };
        let (decoded_width, decoded_height) = img.dimensions();
        anyhow::ensure!(
            (decoded_width, decoded_height) == (info.width, info.height),
            "Decoded WebP dimensions differ from its header"
        );
        if let Some(exif) = webpx::get_exif(bytes)
            .map_err(|error| anyhow::anyhow!("failed to read WebP EXIF metadata: {error}"))?
        {
            if let Some(orientation) = image::metadata::Orientation::from_exif_chunk(&exif) {
                img.apply_orientation(orientation);
            }
        }
        let (width, height) = img.dimensions();
        return Ok((
            img,
            SourceImageDescriptor {
                format: SourceImageFormat::WebP,
                has_alpha: info.has_alpha,
                width,
                height,
            },
        ));
    }

    let mut reader = ImageReader::with_format(Cursor::new(bytes), format);
    reader.limits(image_decode_limits());
    let mut decoder = reader
        .into_decoder()
        .context("Failed to initialize image decoder")?;
    let declared_dimensions = decoder.dimensions();
    validate_image_dimensions(declared_dimensions.0, declared_dimensions.1)?;
    anyhow::ensure!(
        decoder.total_bytes() <= MAX_RASTER_DECODE_BYTES,
        "Decoded image exceeds the supported memory limit"
    );
    let orientation = decoder
        .orientation()
        .context("Failed to read image orientation")?;
    let mut img = DynamicImage::from_decoder(decoder).context("Failed to decode image")?;
    img.apply_orientation(orientation);
    let (width, height) = img.dimensions();
    validate_image_dimensions(width, height)?;
    let has_alpha = img.color().has_alpha();
    Ok((
        img,
        SourceImageDescriptor {
            format: source_format(Some(format)),
            has_alpha,
            width,
            height,
        },
    ))
}

/// Runs a byte-backed image operation under the shared decoded-memory gate.
pub(crate) fn with_source_image_bytes<T>(
    bytes: &[u8],
    format: ImageFormat,
    operation: impl FnOnce(DynamicImage, SourceImageDescriptor) -> Result<T>,
) -> Result<T> {
    let _guard = image_decode_guard();
    let (image, descriptor) = load_source_image_bytes_unlocked(bytes, format)?;
    operation(image, descriptor)
}
