use anyhow::{Context, Result};
use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader, RgbImage, RgbaImage};

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

/// Loads an image from disk and returns both decoded pixels and a descriptor.
pub fn load_source_image(path: &str) -> Result<(DynamicImage, SourceImageDescriptor)> {
    let ext_is_webp = path.to_ascii_lowercase().ends_with(".webp");
    if ext_is_webp {
        let bytes =
            std::fs::read(path).with_context(|| format!("Failed to read image '{path}'"))?;
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

    let mut reader =
        ImageReader::open(path).with_context(|| format!("Failed to open image '{path}'"))?;

    reader = reader
        .with_guessed_format()
        .context("Failed to detect image format")?;

    let format = reader.format();
    let img = reader.decode().context("Failed to decode image")?;

    let (width, height) = img.dimensions();
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
    use super::{compression_class, SourceCompressionClass};
    use image::ImageFormat;

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
}
