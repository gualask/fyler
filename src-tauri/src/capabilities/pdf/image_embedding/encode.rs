use anyhow::Result;
use image::DynamicImage;

use crate::capabilities::raster_compression::{
    encode_jpeg, flatten_to_white_rgb, JpegColor, Raster,
};

use super::policy::{ImageEmbedDecision, PdfImageEncoding};

/// Prepared image payload ready to be embedded as a PDF XObject image.
pub struct PreparedPdfImage {
    pub width: u32,
    pub height: u32,
    /// Image bytes (raw RGB or encoded JPEG) depending on `filter`.
    pub data: Vec<u8>,
    /// Optional PDF stream filter name (e.g. `DCTDecode` for JPEG).
    pub filter: Option<&'static [u8]>,
}

/// Encodes a decoded image according to the provided embedding decision.
pub fn prepare_pdf_image(
    img: DynamicImage,
    decision: ImageEmbedDecision,
    resize_to: Option<(u32, u32)>,
) -> Result<PreparedPdfImage> {
    let rgb = if decision.flatten_alpha {
        flatten_to_white_rgb(img)
    } else {
        img.into_rgb8()
    };
    let raster = Raster::from_rgb_image(rgb);
    let resize_to = resize_to.filter(|&(width, height)| {
        width > 0
            && height > 0
            && width <= raster.width()
            && height <= raster.height()
            && (width != raster.width() || height != raster.height())
    });
    let raster = raster.resize(resize_to)?;
    let (width, height) = (raster.width(), raster.height());

    let (data, filter) = match decision.encoding {
        PdfImageEncoding::RawRgb => (raster.into_data(), None),
        PdfImageEncoding::Jpeg { quality } => (
            encode_jpeg(
                raster.data(),
                raster.width(),
                raster.height(),
                JpegColor::Rgb,
                quality,
            )?,
            Some(b"DCTDecode".as_ref()),
        ),
    };

    Ok(PreparedPdfImage {
        width,
        height,
        data,
        filter,
    })
}

#[cfg(test)]
mod tests {
    use super::super::policy::{ImageEmbedDecision, PdfImageEncoding};
    use super::prepare_pdf_image;
    use image::{DynamicImage, RgbImage, RgbaImage};

    #[test]
    fn jpeg_encoding_uses_dct_filter() -> anyhow::Result<()> {
        let img =
            DynamicImage::ImageRgb8(RgbImage::from_pixel(1600, 900, image::Rgb([120, 140, 160])));
        let prepared = prepare_pdf_image(
            img,
            ImageEmbedDecision {
                flatten_alpha: false,
                encoding: PdfImageEncoding::Jpeg { quality: 82 },
            },
            None,
        )?;

        assert_eq!(prepared.filter, Some(b"DCTDecode".as_ref()));
        assert!(prepared.data.len() < (1600 * 900 * 3) / 10);
        Ok(())
    }

    #[test]
    fn flatten_alpha_outputs_rgb_dimensions() -> anyhow::Result<()> {
        let img = DynamicImage::ImageRgba8(RgbaImage::from_pixel(
            640,
            360,
            image::Rgba([0, 64, 255, 128]),
        ));
        let prepared = prepare_pdf_image(
            img,
            ImageEmbedDecision {
                flatten_alpha: true,
                encoding: PdfImageEncoding::Jpeg { quality: 82 },
            },
            None,
        )?;

        assert_eq!(prepared.width, 640);
        assert_eq!(prepared.height, 360);
        assert_eq!(prepared.filter, Some(b"DCTDecode".as_ref()));
        Ok(())
    }
}
