use anyhow::Result;
use image::{DynamicImage, RgbImage, RgbaImage};
use jpeg_encoder::{ColorType, Encoder};

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
) -> Result<PreparedPdfImage> {
    let rgb = if decision.flatten_alpha {
        flatten_to_white_rgb(img)
    } else {
        img.to_rgb8()
    };
    let (width, height) = rgb.dimensions();

    let (data, filter) = match decision.encoding {
        PdfImageEncoding::RawRgb => (rgb.into_raw(), None),
        PdfImageEncoding::Jpeg { quality } => {
            (encode_jpeg(&rgb, quality)?, Some(b"DCTDecode".as_ref()))
        }
    };

    Ok(PreparedPdfImage {
        width,
        height,
        data,
        filter,
    })
}

fn flatten_to_white_rgb(img: DynamicImage) -> RgbImage {
    if !img.color().has_alpha() {
        return img.to_rgb8();
    }

    let rgba: RgbaImage = img.to_rgba8();
    let (width, height) = rgba.dimensions();
    let mut rgb = RgbImage::new(width, height);

    for (x, y, pixel) in rgba.enumerate_pixels() {
        let alpha = f32::from(pixel[3]) / 255.0;
        let blend = |channel: u8| -> u8 {
            let value = f32::from(channel) * alpha + 255.0 * (1.0 - alpha);
            value.round().clamp(0.0, 255.0) as u8
        };
        rgb.put_pixel(
            x,
            y,
            image::Rgb([blend(pixel[0]), blend(pixel[1]), blend(pixel[2])]),
        );
    }

    rgb
}

fn encode_jpeg(rgb: &RgbImage, quality: u8) -> Result<Vec<u8>> {
    let mut data = Vec::new();
    Encoder::new(&mut data, quality).encode(
        rgb.as_raw(),
        rgb.width() as u16,
        rgb.height() as u16,
        ColorType::Rgb,
    )?;
    Ok(data)
}

#[cfg(test)]
mod tests {
    use super::prepare_pdf_image;
    use crate::pdf_image::policy::{ImageEmbedDecision, PdfImageEncoding};
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
        )?;

        assert_eq!(prepared.width, 640);
        assert_eq!(prepared.height, 360);
        assert_eq!(prepared.filter, Some(b"DCTDecode".as_ref()));
        Ok(())
    }
}
