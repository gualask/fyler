use anyhow::Result;
use image::{RgbImage, RgbaImage};

use super::resize::resize_interleaved;

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum RasterColor {
    Gray,
    Rgb,
    Rgba,
    Cmyk,
}

/// Workflow-neutral interleaved eight-bit raster pixels.
#[derive(Debug)]
pub(crate) struct Raster {
    width: u32,
    height: u32,
    color: RasterColor,
    data: Vec<u8>,
}

impl Raster {
    pub(crate) fn new(width: u32, height: u32, color: RasterColor, data: Vec<u8>) -> Self {
        Self {
            width,
            height,
            color,
            data,
        }
    }

    pub(crate) fn from_rgb_image(image: RgbImage) -> Self {
        let (width, height) = image.dimensions();
        Self::new(width, height, RasterColor::Rgb, image.into_raw())
    }

    pub(crate) fn from_rgba_image(image: RgbaImage) -> Self {
        let (width, height) = image.dimensions();
        Self::new(width, height, RasterColor::Rgba, image.into_raw())
    }

    pub(crate) fn resize(self, dimensions: Option<(u32, u32)>) -> Result<Self> {
        let Some((width, height)) = dimensions else {
            return Ok(self);
        };
        if (width, height) == (self.width, self.height) {
            return Ok(self);
        }
        anyhow::ensure!(
            width <= self.width && height <= self.height,
            "raster upscaling is not supported"
        );

        let data = resize_interleaved(
            self.data,
            (self.width, self.height),
            (width, height),
            self.color,
        )?;
        Ok(Self::new(width, height, self.color, data))
    }

    pub(crate) fn width(&self) -> u32 {
        self.width
    }

    pub(crate) fn height(&self) -> u32 {
        self.height
    }

    pub(crate) fn color(&self) -> RasterColor {
        self.color
    }

    pub(crate) fn data(&self) -> &[u8] {
        &self.data
    }

    pub(crate) fn into_data(self) -> Vec<u8> {
        self.data
    }
}

#[cfg(test)]
mod tests {
    use super::{Raster, RasterColor};

    #[test]
    fn resize_preserves_color_and_uses_target_dimensions() -> anyhow::Result<()> {
        let raster = Raster::new(4, 4, RasterColor::Rgb, vec![64; 4 * 4 * 3]);

        let resized = raster.resize(Some((2, 3)))?;

        assert_eq!((resized.width(), resized.height()), (2, 3));
        assert_eq!(resized.color(), RasterColor::Rgb);
        assert_eq!(resized.data().len(), 2 * 3 * 3);
        Ok(())
    }

    #[test]
    fn resize_rejects_enlargement() {
        let raster = Raster::new(4, 4, RasterColor::Rgb, vec![64; 4 * 4 * 3]);

        assert!(raster.resize(Some((5, 4))).is_err());
    }
}
