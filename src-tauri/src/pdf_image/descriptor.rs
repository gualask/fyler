use anyhow::{Context, Result};
use image::{
    DynamicImage, GenericImageView, ImageFormat, ImageReader, Limits, RgbImage, RgbaImage,
};
use std::sync::{Mutex, MutexGuard, OnceLock};

const MAX_IMAGE_DIMENSION: u32 = 32_768;
const MAX_IMAGE_PIXELS: u64 = 64 * 1024 * 1024;
const MAX_SOURCE_IMAGE_BYTES: u64 = 256 * 1024 * 1024;
const MAX_WEBP_INPUT_BYTES: u64 = 64 * 1024 * 1024;
const MAX_IMAGE_DECODE_BYTES: u64 = 256 * 1024 * 1024;

static IMAGE_DECODE_LOCK: OnceLock<Mutex<()>> = OnceLock::new();

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Coarse compression class derived from the source image format.
pub enum SourceCompressionClass {
    /// A lossy encoding (currently JPEG, lossy WebP).
    Lossy,
    /// Lossless or unknown (conservative default).
    LosslessOrUnknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
/// Lightweight metadata about a source image.
pub struct SourceImageDescriptor {
    pub compression_class: SourceCompressionClass,
    pub has_alpha: bool,
    pub width: u32,
    pub height: u32,
}

fn image_decode_guard() -> MutexGuard<'static, ()> {
    IMAGE_DECODE_LOCK
        .get_or_init(|| Mutex::new(()))
        .lock()
        .unwrap_or_else(|poisoned| poisoned.into_inner())
}

fn validate_image_dimensions(width: u32, height: u32) -> Result<()> {
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

fn read_webp_bytes(path: &str) -> Result<Vec<u8>> {
    let byte_size = std::fs::metadata(path)
        .context("Failed to inspect WebP image")?
        .len();
    anyhow::ensure!(
        byte_size <= MAX_WEBP_INPUT_BYTES,
        "WebP input exceeds the supported size limit"
    );
    std::fs::read(path).context("Failed to read WebP image")
}

fn validate_source_image_file_size(path: &str) -> Result<()> {
    let byte_size = std::fs::metadata(path)
        .context("Failed to inspect image")?
        .len();
    anyhow::ensure!(
        byte_size <= MAX_SOURCE_IMAGE_BYTES,
        "Image input exceeds the supported size limit"
    );
    Ok(())
}

fn webp_dimensions_and_bytes(path: &str) -> Result<((u32, u32), Vec<u8>)> {
    let bytes = read_webp_bytes(path)?;
    let info = webpx::ImageInfo::from_webp(&bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
    validate_image_dimensions(info.width, info.height)?;
    Ok(((info.width, info.height), bytes))
}

fn generic_image_dimensions(path: &str) -> Result<(u32, u32)> {
    validate_source_image_file_size(path)?;
    let reader = ImageReader::open(path)
        .context("Failed to open image")?
        .with_guessed_format()
        .context("Failed to detect image format")?;
    let dimensions = reader
        .into_dimensions()
        .context("Failed to read image dimensions")?;
    validate_image_dimensions(dimensions.0, dimensions.1)?;
    Ok(dimensions)
}

fn source_image_dimensions_unlocked(path: &str) -> Result<(u32, u32)> {
    if path.to_ascii_lowercase().ends_with(".webp") {
        return webp_dimensions_and_bytes(path).map(|(dimensions, _)| dimensions);
    }
    generic_image_dimensions(path)
}

/// Reads source dimensions under the same resource gate used by full image decodes.
pub(crate) fn source_image_dimensions(path: &str) -> Result<(u32, u32)> {
    let _guard = image_decode_guard();
    source_image_dimensions_unlocked(path)
}

fn image_decode_limits() -> Limits {
    let mut limits = Limits::default();
    limits.max_image_width = Some(MAX_IMAGE_DIMENSION);
    limits.max_image_height = Some(MAX_IMAGE_DIMENSION);
    limits.max_alloc = Some(MAX_IMAGE_DECODE_BYTES);
    limits
}

fn load_source_image_unlocked(path: &str) -> Result<(DynamicImage, SourceImageDescriptor)> {
    let ext_is_webp = path.to_ascii_lowercase().ends_with(".webp");
    if ext_is_webp {
        let ((declared_width, declared_height), bytes) = webp_dimensions_and_bytes(path)?;
        let info =
            webpx::ImageInfo::from_webp(&bytes).map_err(|error| anyhow::anyhow!("{error}"))?;

        let img = if info.has_alpha {
            let (pixels, width, height) =
                webpx::decode_rgba(&bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
            let rgba = RgbaImage::from_raw(width, height, pixels)
                .context("Failed to build RGBA buffer for WebP decode")?;
            DynamicImage::ImageRgba8(rgba)
        } else {
            let (pixels, width, height) =
                webpx::decode_rgb(&bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
            let rgb = RgbImage::from_raw(width, height, pixels)
                .context("Failed to build RGB buffer for WebP decode")?;
            DynamicImage::ImageRgb8(rgb)
        };

        let (width, height) = img.dimensions();
        validate_image_dimensions(width, height)?;
        anyhow::ensure!(
            (width, height) == (declared_width, declared_height),
            "Decoded WebP dimensions differ from its header"
        );
        let compression_class = SourceCompressionClass::Lossy;
        let has_alpha = img.color().has_alpha();

        return Ok((
            img,
            SourceImageDescriptor {
                compression_class,
                has_alpha,
                width,
                height,
            },
        ));
    }

    generic_image_dimensions(path)?;
    let mut reader = ImageReader::open(path).context("Failed to open image")?;

    reader = reader
        .with_guessed_format()
        .context("Failed to detect image format")?;

    let format = reader.format();
    reader.limits(image_decode_limits());
    let img = reader.decode().context("Failed to decode image")?;

    let (width, height) = img.dimensions();
    validate_image_dimensions(width, height)?;
    let compression_class = compression_class(path, format)?;
    let has_alpha = img.color().has_alpha();

    Ok((
        img,
        SourceImageDescriptor {
            compression_class,
            has_alpha,
            width,
            height,
        },
    ))
}

/// Runs a complete source-image operation under the process-wide image memory gate.
///
/// Callers keep the gate while converting/resizing/encoding, where most temporary copies exist.
pub fn with_source_image<T>(
    path: &str,
    operation: impl FnOnce(DynamicImage, SourceImageDescriptor) -> Result<T>,
) -> Result<T> {
    let _guard = image_decode_guard();
    let (image, descriptor) = load_source_image_unlocked(path)?;
    operation(image, descriptor)
}

fn compression_class(path: &str, format: Option<ImageFormat>) -> Result<SourceCompressionClass> {
    Ok(match format {
        Some(ImageFormat::Jpeg) => SourceCompressionClass::Lossy,
        // WebP cannot be embedded directly in PDFs, so we always transcode it.
        // Treat it as lossy to ensure we embed it as JPEG and avoid huge raw streams.
        Some(ImageFormat::WebP) => {
            let _ = path;
            SourceCompressionClass::Lossy
        }
        Some(ImageFormat::Png)
        | Some(ImageFormat::Bmp)
        | Some(ImageFormat::Gif)
        | Some(ImageFormat::Ico)
        | Some(ImageFormat::Qoi)
        | Some(ImageFormat::Tga)
        | Some(ImageFormat::Tiff) => SourceCompressionClass::LosslessOrUnknown,
        _ => SourceCompressionClass::LosslessOrUnknown,
    })
}

#[cfg(test)]
mod tests {
    use super::{
        compression_class, validate_image_dimensions, with_source_image, SourceCompressionClass,
    };
    use image::{ImageFormat, RgbImage};
    use std::sync::atomic::{AtomicUsize, Ordering};
    use std::sync::{Arc, Barrier};

    #[test]
    fn jpeg_maps_to_lossy() -> anyhow::Result<()> {
        let class = compression_class("photo.jpg", Some(ImageFormat::Jpeg))?;
        assert_eq!(class, SourceCompressionClass::Lossy);
        Ok(())
    }

    #[test]
    fn png_maps_to_lossless_or_unknown() -> anyhow::Result<()> {
        let class = compression_class("photo.png", Some(ImageFormat::Png))?;
        assert_eq!(class, SourceCompressionClass::LosslessOrUnknown);
        Ok(())
    }

    #[test]
    fn webp_maps_to_lossy() -> anyhow::Result<()> {
        assert_eq!(
            compression_class("photo.webp", Some(ImageFormat::WebP))?,
            SourceCompressionClass::Lossy
        );
        Ok(())
    }

    #[test]
    fn image_dimensions_enforce_both_axis_and_pixel_budgets() {
        assert!(validate_image_dimensions(8_000, 8_000).is_ok());
        assert!(validate_image_dimensions(0, 100).is_err());
        assert!(validate_image_dimensions(32_769, 1).is_err());
        assert!(validate_image_dimensions(16_384, 16_384).is_err());
    }

    #[test]
    fn source_image_operations_do_not_overlap_their_pixel_buffer_phase() -> anyhow::Result<()> {
        const WORKERS: usize = 4;
        let path =
            std::env::temp_dir().join(format!("fyler-image-gate-{}.png", uuid::Uuid::new_v4()));
        RgbImage::new(2, 2).save(&path)?;
        let path = Arc::new(path);
        let barrier = Arc::new(Barrier::new(WORKERS));
        let active = Arc::new(AtomicUsize::new(0));
        let max_active = Arc::new(AtomicUsize::new(0));

        let handles = (0..WORKERS)
            .map(|_| {
                let path = path.clone();
                let barrier = barrier.clone();
                let active = active.clone();
                let max_active = max_active.clone();
                std::thread::spawn(move || -> anyhow::Result<()> {
                    barrier.wait();
                    with_source_image(path.to_string_lossy().as_ref(), |_image, _descriptor| {
                        let now = active.fetch_add(1, Ordering::SeqCst) + 1;
                        max_active.fetch_max(now, Ordering::SeqCst);
                        std::thread::sleep(std::time::Duration::from_millis(10));
                        active.fetch_sub(1, Ordering::SeqCst);
                        Ok(())
                    })
                })
            })
            .collect::<Vec<_>>();

        for handle in handles {
            handle.join().expect("image operation worker")?;
        }
        assert_eq!(max_active.load(Ordering::SeqCst), 1);
        let _ = std::fs::remove_file(path.as_ref());
        Ok(())
    }
}
