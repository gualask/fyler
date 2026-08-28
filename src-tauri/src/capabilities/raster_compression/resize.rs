use super::raster::RasterColor;
use anyhow::{Context, Result};
use fast_image_resize::{images::Image, FilterType, PixelType, ResizeAlg, ResizeOptions, Resizer};

impl RasterColor {
    fn pixel_type(self) -> PixelType {
        match self {
            Self::Gray => PixelType::U8,
            Self::Rgb => PixelType::U8x3,
            Self::Rgba | Self::Cmyk => PixelType::U8x4,
        }
    }
}

/// Resizes interleaved eight-bit pixels using the production Lanczos filter.
pub(crate) fn resize_interleaved(
    data: Vec<u8>,
    source: (u32, u32),
    target: (u32, u32),
    color: RasterColor,
) -> Result<Vec<u8>> {
    let pixel_type = color.pixel_type();
    let source = Image::from_vec_u8(source.0, source.1, data, pixel_type)
        .context("failed to map source raster")?;
    let mut destination = Image::new(target.0, target.1, pixel_type);
    let options = ResizeOptions::new()
        .resize_alg(ResizeAlg::Convolution(FilterType::Lanczos3))
        .use_alpha(color == RasterColor::Rgba);

    Resizer::new()
        .resize(&source, &mut destination, &options)
        .context("failed to resize raster")?;

    Ok(destination.into_vec())
}

#[cfg(test)]
mod tests {
    use super::resize_interleaved;
    use crate::capabilities::raster_compression::RasterColor;

    #[test]
    fn rgb_resize_returns_the_requested_layout() -> anyhow::Result<()> {
        let resized = resize_interleaved(vec![64; 4 * 4 * 3], (4, 4), (2, 3), RasterColor::Rgb)?;

        assert_eq!(resized.len(), 2 * 3 * 3);
        Ok(())
    }

    #[test]
    fn rgba_resize_preserves_the_alpha_layout() -> anyhow::Result<()> {
        let resized = resize_interleaved(vec![64; 4 * 4 * 4], (4, 4), (2, 3), RasterColor::Rgba)?;

        assert_eq!(resized.len(), 2 * 3 * 4);
        Ok(())
    }
}
