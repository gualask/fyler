use anyhow::Result;
use jpeg_encoder::{ColorType, Encoder};

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub(crate) enum JpegColor {
    Luma,
    Rgb,
    Cmyk,
}

/// Encodes an interleaved eight-bit raster as JPEG.
pub(crate) fn encode_jpeg(
    data: &[u8],
    width: u32,
    height: u32,
    color: JpegColor,
    quality: u8,
) -> Result<Vec<u8>> {
    let mut encoded = Vec::with_capacity((width as usize * height as usize) / 2);
    let color_type = match color {
        JpegColor::Luma => ColorType::Luma,
        JpegColor::Rgb => ColorType::Rgb,
        JpegColor::Cmyk => ColorType::CmykAsYcck,
    };
    Encoder::new(&mut encoded, quality).encode(data, width as u16, height as u16, color_type)?;
    Ok(encoded)
}

#[cfg(test)]
mod tests {
    use jpeg_decoder::Decoder;

    use super::{encode_jpeg, JpegColor};

    #[test]
    fn rgb_encoding_preserves_dimensions() -> anyhow::Result<()> {
        let encoded = encode_jpeg(&[128; 4 * 3 * 3], 4, 3, JpegColor::Rgb, 92)?;
        let mut decoder = Decoder::new(std::io::Cursor::new(encoded));
        decoder.read_info()?;
        let info = decoder.info().expect("JPEG info");

        assert_eq!((info.width, info.height), (4, 3));
        Ok(())
    }
}
