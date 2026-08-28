use anyhow::{Context, Result};
use image::{
    codecs::{
        bmp::BmpEncoder,
        png::{CompressionType, FilterType, PngEncoder},
    },
    ExtendedColorType, ImageEncoder,
};

use super::{Raster, RasterColor};

pub(super) fn encode_png(raster: &Raster) -> Result<Vec<u8>> {
    let color = match raster.color() {
        RasterColor::Rgb => ExtendedColorType::Rgb8,
        RasterColor::Rgba => ExtendedColorType::Rgba8,
        _ => anyhow::bail!("PNG output requires RGB or RGBA pixels"),
    };
    let mut encoded = Vec::new();
    PngEncoder::new_with_quality(&mut encoded, CompressionType::Best, FilterType::Adaptive)
        .write_image(raster.data(), raster.width(), raster.height(), color)
        .context("failed to encode PNG")?;
    Ok(encoded)
}

pub(super) fn encode_bmp(raster: &Raster) -> Result<Vec<u8>> {
    anyhow::ensure!(
        raster.color() == RasterColor::Rgb,
        "BMP output requires RGB pixels"
    );
    let mut encoded = Vec::new();
    BmpEncoder::new(&mut encoded)
        .encode(
            raster.data(),
            raster.width(),
            raster.height(),
            ExtendedColorType::Rgb8,
        )
        .context("failed to encode BMP")?;
    Ok(encoded)
}

pub(super) fn encode_webp(raster: &Raster, quality: u8) -> Result<Vec<u8>> {
    let config = webpx::EncoderConfig::new().quality(f32::from(quality));
    match raster.color() {
        RasterColor::Rgb => config
            .encode_rgb(
                raster.data(),
                raster.width(),
                raster.height(),
                webpx::Unstoppable,
            )
            .map_err(|error| anyhow::anyhow!("failed to encode WebP: {error}")),
        RasterColor::Rgba => config
            .encode_rgba(
                raster.data(),
                raster.width(),
                raster.height(),
                webpx::Unstoppable,
            )
            .map_err(|error| anyhow::anyhow!("failed to encode WebP: {error}")),
        _ => anyhow::bail!("WebP output requires RGB or RGBA pixels"),
    }
}

#[cfg(test)]
mod tests {
    use super::{encode_bmp, encode_png, encode_webp};
    use crate::capabilities::raster_compression::{Raster, RasterColor};

    #[test]
    fn png_and_webp_preserve_rgba_output() -> anyhow::Result<()> {
        let raster = Raster::new(
            2,
            2,
            RasterColor::Rgba,
            vec![
                10, 20, 30, 40, 10, 20, 30, 40, 10, 20, 30, 40, 10, 20, 30, 40,
            ],
        );

        let png = encode_png(&raster)?;
        let png = image::load_from_memory_with_format(&png, image::ImageFormat::Png)?.into_rgba8();
        assert_eq!(png.get_pixel(0, 0).0, [10, 20, 30, 40]);

        let webp = encode_webp(&raster, 92)?;
        let (pixels, width, height) =
            webpx::decode_rgba(&webp).map_err(|error| anyhow::anyhow!("{error}"))?;
        assert_eq!((width, height), (2, 2));
        assert_eq!(pixels[3], 40);
        Ok(())
    }

    #[test]
    fn bmp_encoder_produces_a_decodable_rgb_image() -> anyhow::Result<()> {
        let raster = Raster::new(3, 2, RasterColor::Rgb, vec![100; 3 * 2 * 3]);
        let encoded = encode_bmp(&raster)?;
        let decoded = image::load_from_memory_with_format(&encoded, image::ImageFormat::Bmp)?;
        assert_eq!((decoded.width(), decoded.height()), (3, 2));
        Ok(())
    }
}
