use anyhow::{Context, Result};
use jpeg_decoder::{Decoder, PixelFormat};

use super::{Raster, RasterColor, MAX_RASTER_DECODE_BYTES};

/// Decodes JPEG bytes into the shared raster representation.
pub(crate) fn decode_jpeg(
    bytes: &[u8],
    expected_color: RasterColor,
    resize_to: Option<(u32, u32)>,
) -> Result<Raster> {
    let mut decoder = Decoder::new(std::io::Cursor::new(bytes));
    decoder.set_max_decoding_buffer_size(MAX_RASTER_DECODE_BYTES as usize);
    if let Some((width, height)) = resize_to {
        let _ = decoder.scale(
            width.min(u16::MAX as u32) as u16,
            height.min(u16::MAX as u32) as u16,
        );
    }
    let data = decoder.decode().context("failed to decode jpeg image")?;
    let info = decoder
        .info()
        .context("jpeg headers missing after decode")?;
    let color = match info.pixel_format {
        PixelFormat::L8 => RasterColor::Gray,
        PixelFormat::RGB24 => RasterColor::Rgb,
        PixelFormat::CMYK32 => RasterColor::Cmyk,
        _ => anyhow::bail!("unsupported jpeg pixel format"),
    };
    anyhow::ensure!(
        color == expected_color,
        "jpeg decode color space mismatch: expected {expected_color:?}, got {color:?}"
    );
    Ok(Raster::new(
        u32::from(info.width),
        u32::from(info.height),
        color,
        data,
    ))
}

#[cfg(test)]
mod tests {
    use super::decode_jpeg;
    use crate::capabilities::raster_compression::{encode_jpeg, JpegColor, RasterColor};

    #[test]
    fn decodes_into_the_requested_shared_raster_color() -> anyhow::Result<()> {
        let encoded = encode_jpeg(&[80; 4 * 3 * 3], 4, 3, JpegColor::Rgb, 92)?;
        let raster = decode_jpeg(&encoded, RasterColor::Rgb, None)?;
        assert_eq!((raster.width(), raster.height()), (4, 3));
        assert_eq!(raster.color(), RasterColor::Rgb);
        Ok(())
    }
}
