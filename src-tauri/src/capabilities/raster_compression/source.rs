use anyhow::{Context, Result};
use image::{
    DynamicImage, GenericImageView, ImageDecoder, ImageFormat, ImageReader, Limits, RgbImage,
    RgbaImage,
};
use std::sync::{Mutex, MutexGuard, OnceLock};

mod bytes;
mod metadata;
pub(super) use bytes::with_source_image_bytes;
pub(crate) use metadata::{source_image_dimensions, source_image_requires_orientation};
use metadata::{webp_dimensions_and_bytes, webp_orientation};

const MAX_IMAGE_DIMENSION: u32 = 32_768;
const MAX_IMAGE_PIXELS: u64 = 64 * 1024 * 1024;
const MAX_SOURCE_IMAGE_BYTES: u64 = 256 * 1024 * 1024;
const MAX_WEBP_INPUT_BYTES: u64 = 64 * 1024 * 1024;
pub(crate) const MAX_RASTER_DECODE_BYTES: u64 = 256 * 1024 * 1024;

static IMAGE_DECODE_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum SourceImageFormat {
    Jpeg,
    Png,
    WebP,
    Bmp,
    Other,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Workflow-neutral metadata about a source image.
pub(crate) struct SourceImageDescriptor {
    pub(crate) format: SourceImageFormat,
    pub(crate) has_alpha: bool,
    pub(crate) width: u32,
    pub(crate) height: u32,
}

pub(super) fn image_decode_guard() -> MutexGuard<'static, ()> {
    IMAGE_DECODE_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn validate_source_bytes(bytes: &[u8], webp: bool) -> Result<()> {
    validate_source_byte_size(u64::try_from(bytes.len()).unwrap_or(u64::MAX), webp)
}

fn validate_source_byte_size(byte_size: u64, webp: bool) -> Result<()> {
    let limit = if webp {
        MAX_WEBP_INPUT_BYTES
    } else {
        MAX_SOURCE_IMAGE_BYTES
    };
    anyhow::ensure!(
        byte_size <= limit,
        "Image input exceeds the supported size limit"
    );
    Ok(())
}

pub(super) fn validate_image_dimensions(width: u32, height: u32) -> Result<()> {
    anyhow::ensure!(width > 0 && height > 0, "Image has invalid dimensions");
    anyhow::ensure!(
        width <= MAX_IMAGE_DIMENSION && height <= MAX_IMAGE_DIMENSION,
        "Image dimensions exceed the supported limit"
    );
    anyhow::ensure!(
        u64::from(width).saturating_mul(u64::from(height)) <= MAX_IMAGE_PIXELS,
        "Image pixel count exceeds the supported limit"
    );
    Ok(())
}

pub(crate) fn validate_raster_layout(width: u32, height: u32, components: usize) -> Result<()> {
    validate_image_dimensions(width, height)?;
    let decoded_bytes = u64::from(width)
        .saturating_mul(u64::from(height))
        .saturating_mul(u64::try_from(components).unwrap_or(u64::MAX));
    anyhow::ensure!(
        decoded_bytes <= MAX_RASTER_DECODE_BYTES,
        "Decoded raster exceeds the supported memory limit"
    );
    Ok(())
}

pub(super) fn read_webp_bytes(path: &str) -> Result<Vec<u8>> {
    let byte_size = std::fs::metadata(path)
        .context("Failed to inspect WebP image")?
        .len();
    anyhow::ensure!(
        byte_size <= MAX_WEBP_INPUT_BYTES,
        "WebP input exceeds the supported size limit"
    );
    std::fs::read(path).context("Failed to read WebP image")
}

pub(super) fn validate_source_image_file_size(path: &str) -> Result<()> {
    let byte_size = std::fs::metadata(path)
        .context("Failed to inspect image")?
        .len();
    anyhow::ensure!(
        byte_size <= MAX_SOURCE_IMAGE_BYTES,
        "Image input exceeds the supported size limit"
    );
    Ok(())
}

fn image_decode_limits() -> Limits {
    let mut limits = Limits::default();
    limits.max_image_width = Some(MAX_IMAGE_DIMENSION);
    limits.max_image_height = Some(MAX_IMAGE_DIMENSION);
    limits.max_alloc = Some(MAX_RASTER_DECODE_BYTES);
    limits
}

fn decode_webp_image(bytes: &[u8], has_alpha: bool) -> Result<DynamicImage> {
    if has_alpha {
        let (pixels, width, height) =
            webpx::decode_rgba(bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
        let rgba = RgbaImage::from_raw(width, height, pixels)
            .context("Failed to build RGBA buffer for WebP decode")?;
        return Ok(DynamicImage::ImageRgba8(rgba));
    }

    let (pixels, width, height) =
        webpx::decode_rgb(bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
    let rgb = RgbImage::from_raw(width, height, pixels)
        .context("Failed to build RGB buffer for WebP decode")?;
    Ok(DynamicImage::ImageRgb8(rgb))
}

fn load_webp_source_image(path: &str) -> Result<(DynamicImage, SourceImageDescriptor)> {
    let ((declared_width, declared_height), bytes) = webp_dimensions_and_bytes(path)?;
    let info = webpx::ImageInfo::from_webp(&bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
    let mut image = decode_webp_image(&bytes, info.has_alpha)?;
    let (width, height) = image.dimensions();
    validate_image_dimensions(width, height)?;
    anyhow::ensure!(
        (width, height) == (declared_width, declared_height),
        "Decoded WebP dimensions differ from its header"
    );
    image.apply_orientation(webp_orientation(&bytes)?);
    let (width, height) = image.dimensions();
    validate_image_dimensions(width, height)?;

    let descriptor = SourceImageDescriptor {
        format: SourceImageFormat::WebP,
        has_alpha: image.color().has_alpha(),
        width,
        height,
    };
    Ok((image, descriptor))
}

fn load_generic_source_image(path: &str) -> Result<(DynamicImage, SourceImageDescriptor)> {
    validate_source_image_file_size(path)?;
    let mut reader = ImageReader::open(path).context("Failed to open image")?;
    reader = reader
        .with_guessed_format()
        .context("Failed to detect image format")?;
    let format = reader.format();
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
    let mut image = DynamicImage::from_decoder(decoder).context("Failed to decode image")?;
    image.apply_orientation(orientation);
    let (width, height) = image.dimensions();
    validate_image_dimensions(width, height)?;

    let descriptor = SourceImageDescriptor {
        format: source_format(format),
        has_alpha: image.color().has_alpha(),
        width,
        height,
    };
    Ok((image, descriptor))
}

pub(super) fn load_source_image_unlocked(
    path: &str,
) -> Result<(DynamicImage, SourceImageDescriptor)> {
    if path.to_ascii_lowercase().ends_with(".webp") {
        load_webp_source_image(path)
    } else {
        load_generic_source_image(path)
    }
}

/// Runs a complete source-image operation under the process-wide image memory gate.
///
/// Callers keep the gate while converting/resizing/encoding, where most temporary copies exist.
pub(crate) fn with_source_image<T>(
    path: &str,
    operation: impl FnOnce(DynamicImage, SourceImageDescriptor) -> Result<T>,
) -> Result<T> {
    let _guard = image_decode_guard();
    let (image, descriptor) = load_source_image_unlocked(path)?;
    operation(image, descriptor)
}

fn source_format(format: Option<ImageFormat>) -> SourceImageFormat {
    match format {
        Some(ImageFormat::Jpeg) => SourceImageFormat::Jpeg,
        Some(ImageFormat::Png) => SourceImageFormat::Png,
        Some(ImageFormat::WebP) => SourceImageFormat::WebP,
        Some(ImageFormat::Bmp) => SourceImageFormat::Bmp,
        _ => SourceImageFormat::Other,
    }
}

#[cfg(test)]
mod tests;
