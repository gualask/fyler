use anyhow::{Context, Result};
use image::{imageops, imageops::FilterType, GrayImage, RgbImage};
use lopdf::Stream;

use crate::models::OptimizeOptions;

use super::candidate::{ImageCandidate, SupportedColorSpace};

#[derive(Debug)]
pub enum DecodedRaster {
    Rgb(RgbImage),
    Gray(GrayImage),
}

impl DecodedRaster {
    pub fn decode(stream: &Stream, candidate: &ImageCandidate) -> Result<Self> {
        let raw = stream.get_plain_content()?;
        let expected_len = match candidate.color_space {
            SupportedColorSpace::Rgb => candidate.width as usize * candidate.height as usize * 3,
            SupportedColorSpace::Gray => candidate.width as usize * candidate.height as usize,
        };

        if raw.len() != expected_len {
            anyhow::bail!("decoded raster length mismatch");
        }

        match candidate.color_space {
            SupportedColorSpace::Rgb => Ok(Self::Rgb(
                RgbImage::from_raw(candidate.width, candidate.height, raw)
                    .context("failed to build RGB image")?,
            )),
            SupportedColorSpace::Gray => Ok(Self::Gray(
                GrayImage::from_raw(candidate.width, candidate.height, raw)
                    .context("failed to build grayscale image")?,
            )),
        }
    }

    pub fn transform(self, opts: &OptimizeOptions) -> Self {
        match self {
            Self::Rgb(image) => Self::Rgb(resize_rgb(image, opts.max_px)),
            Self::Gray(image) => Self::Gray(resize_gray(image, opts.max_px)),
        }
    }

    pub fn width(&self) -> u32 {
        match self {
            Self::Rgb(image) => image.width(),
            Self::Gray(image) => image.width(),
        }
    }

    pub fn height(&self) -> u32 {
        match self {
            Self::Rgb(image) => image.height(),
            Self::Gray(image) => image.height(),
        }
    }

    pub fn into_raw(self) -> Vec<u8> {
        match self {
            Self::Rgb(image) => image.into_raw(),
            Self::Gray(image) => image.into_raw(),
        }
    }
}

fn resize_dimensions(width: u32, height: u32, max_px: Option<u32>) -> Option<(u32, u32)> {
    let max_px = max_px?;
    let long_side = width.max(height);
    if long_side <= max_px {
        return None;
    }

    let scale = max_px as f64 / long_side as f64;
    let next_width = ((width as f64 * scale).round() as u32).max(1);
    let next_height = ((height as f64 * scale).round() as u32).max(1);
    Some((next_width, next_height))
}

fn resize_rgb(image: RgbImage, max_px: Option<u32>) -> RgbImage {
    match resize_dimensions(image.width(), image.height(), max_px) {
        Some((width, height)) => imageops::resize(&image, width, height, FilterType::Lanczos3),
        None => image,
    }
}

fn resize_gray(image: GrayImage, max_px: Option<u32>) -> GrayImage {
    match resize_dimensions(image.width(), image.height(), max_px) {
        Some((width, height)) => imageops::resize(&image, width, height, FilterType::Lanczos3),
        None => image,
    }
}
