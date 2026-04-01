use anyhow::{Context, Result};
use fast_image_resize::{images::Image, FilterType, PixelType, ResizeAlg, ResizeOptions, Resizer};
use jpeg_decoder::{Decoder as JpegDecoder, PixelFormat};
use lopdf::Stream;

use super::candidate::{ImageCandidate, SourceEncoding, SupportedColorSpace};

#[derive(Debug)]
/// Decoded raster pixels extracted from an embedded PDF image stream.
pub struct DecodedRaster {
    width: u32,
    height: u32,
    color_space: SupportedColorSpace,
    data: Vec<u8>,
}

impl DecodedRaster {
    /// Decodes a candidate image stream into raw pixel data (supports raw and JPEG sources).
    pub fn decode(stream: &Stream, candidate: &ImageCandidate) -> Result<Self> {
        match candidate.source_encoding {
            SourceEncoding::Raw => Self::decode_raw(stream, candidate),
            SourceEncoding::Jpeg => Self::decode_jpeg(stream, candidate),
        }
    }

    /// Resizes the raster to the provided dimensions (when present), preserving color space.
    pub fn resize(self, dimensions: Option<(u32, u32)>) -> Result<Self> {
        let Some((width, height)) = dimensions else {
            return Ok(self);
        };
        if width == self.width && height == self.height {
            return Ok(self);
        }

        let pixel_type = match self.color_space {
            SupportedColorSpace::Gray => PixelType::U8,
            SupportedColorSpace::Rgb => PixelType::U8x3,
            SupportedColorSpace::Cmyk => PixelType::U8x4,
        };

        let src_image = Image::from_vec_u8(self.width, self.height, self.data, pixel_type)
            .context("failed to map source raster")?;
        let mut dst_image = Image::new(width, height, pixel_type);
        let options = ResizeOptions::new()
            .resize_alg(ResizeAlg::Convolution(FilterType::Lanczos3))
            .use_alpha(false);

        Resizer::new()
            .resize(&src_image, &mut dst_image, &options)
            .context("failed to resize raster")?;

        Ok(Self {
            width,
            height,
            color_space: self.color_space,
            data: dst_image.into_vec(),
        })
    }

    /// Raster width in pixels.
    pub fn width(&self) -> u32 {
        self.width
    }

    /// Raster height in pixels.
    pub fn height(&self) -> u32 {
        self.height
    }

    /// Raster color space.
    pub fn color_space(&self) -> SupportedColorSpace {
        self.color_space
    }

    /// Raw interleaved pixel bytes (layout depends on `color_space`).
    pub fn data(&self) -> &[u8] {
        &self.data
    }

    /// Consumes the raster and returns its raw pixel bytes.
    pub fn into_raw(self) -> Vec<u8> {
        self.data
    }

    fn decode_raw(stream: &Stream, candidate: &ImageCandidate) -> Result<Self> {
        let raw = stream.get_plain_content()?;
        let expected_len = candidate.width as usize
            * candidate.height as usize
            * candidate.color_space.components();
        if raw.len() != expected_len {
            anyhow::bail!("decoded raster length mismatch");
        }

        Ok(Self {
            width: candidate.width,
            height: candidate.height,
            color_space: candidate.color_space,
            data: raw,
        })
    }

    fn decode_jpeg(stream: &Stream, candidate: &ImageCandidate) -> Result<Self> {
        let mut decoder = JpegDecoder::new(std::io::Cursor::new(stream.content.as_slice()));
        let data = decoder.decode().context("failed to decode jpeg image")?;
        let info = decoder
            .info()
            .context("jpeg headers missing after decode")?;
        let color_space = match info.pixel_format {
            PixelFormat::L8 => SupportedColorSpace::Gray,
            PixelFormat::RGB24 => SupportedColorSpace::Rgb,
            PixelFormat::CMYK32 => SupportedColorSpace::Cmyk,
            _ => anyhow::bail!("unsupported jpeg pixel format"),
        };

        if color_space != candidate.color_space {
            anyhow::bail!(
                "jpeg decode color space mismatch: expected {:?}, got {:?}",
                candidate.color_space,
                color_space
            );
        }

        Ok(Self {
            width: info.width as u32,
            height: info.height as u32,
            color_space,
            data,
        })
    }
}
