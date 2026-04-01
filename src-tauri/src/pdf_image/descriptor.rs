use anyhow::{Context, Result};
use image::{DynamicImage, GenericImageView, ImageFormat, ImageReader};

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
        Some(ImageFormat::WebP) => sniff_webp_compression_class(path)?,
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

fn sniff_webp_compression_class(path: &str) -> Result<SourceCompressionClass> {
    let bytes = std::fs::read(path).with_context(|| format!("Failed to read image '{path}'"))?;
    if bytes.len() < 16 || &bytes[0..4] != b"RIFF" || &bytes[8..12] != b"WEBP" {
        return Ok(SourceCompressionClass::LosslessOrUnknown);
    }

    Ok(match &bytes[12..16] {
        b"VP8 " => SourceCompressionClass::Lossy,
        b"VP8L" => SourceCompressionClass::LosslessOrUnknown,
        _ => SourceCompressionClass::LosslessOrUnknown,
    })
}

#[cfg(test)]
mod tests {
    use super::{compression_class, sniff_webp_compression_class, SourceCompressionClass};
    use image::ImageFormat;
    use std::fs;
    use std::path::Path;

    fn temp_path(label: &str) -> std::path::PathBuf {
        std::env::temp_dir().join(format!("fyler-pdf-image-{label}.bin"))
    }

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
    fn webp_sniff_detects_lossy_and_lossless() -> anyhow::Result<()> {
        let lossy = temp_path("lossy.webp");
        fs::write(&lossy, b"RIFF\x10\x00\x00\x00WEBPVP8 ")?;
        assert_eq!(
            sniff_webp_compression_class(lossy.to_string_lossy().as_ref())?,
            SourceCompressionClass::Lossy
        );

        let lossless = temp_path("lossless.webp");
        fs::write(&lossless, b"RIFF\x10\x00\x00\x00WEBPVP8L")?;
        assert_eq!(
            sniff_webp_compression_class(lossless.to_string_lossy().as_ref())?,
            SourceCompressionClass::LosslessOrUnknown
        );

        let _ = fs::remove_file(lossy);
        let _ = fs::remove_file(lossless);
        Ok(())
    }

    #[test]
    fn invalid_webp_falls_back_conservatively() -> anyhow::Result<()> {
        let path = temp_path("invalid.webp");
        fs::write(&path, b"not-a-webp")?;
        assert_eq!(
            sniff_webp_compression_class(path.to_string_lossy().as_ref())?,
            SourceCompressionClass::LosslessOrUnknown
        );
        let _ = fs::remove_file(path);
        Ok(())
    }

    #[test]
    fn temp_paths_are_local() {
        assert!(Path::new(&temp_path("check")).is_absolute());
    }
}
