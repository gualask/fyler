use anyhow::Result;
use jpeg_encoder::{ColorType, Encoder};
use lopdf::{Object, Stream};

use super::candidate::SupportedColorSpace;
use super::plan::OutputEncoding;
use super::raster::DecodedRaster;

fn encode_jpeg(raster: &DecodedRaster, quality: u8) -> Result<Vec<u8>> {
    let mut buf = Vec::with_capacity((raster.width() as usize * raster.height() as usize) / 2);
    let color_type = match raster.color_space() {
        SupportedColorSpace::Gray => ColorType::Luma,
        SupportedColorSpace::Rgb => ColorType::Rgb,
        SupportedColorSpace::Cmyk => ColorType::CmykAsYcck,
    };

    Encoder::new(&mut buf, quality).encode(
        raster.data(),
        raster.width() as u16,
        raster.height() as u16,
        color_type,
    )?;
    Ok(buf)
}

fn normalize_common_dict(stream: &mut Stream, raster: &DecodedRaster) {
    stream.dict.set("Width", raster.width() as i64);
    stream.dict.set("Height", raster.height() as i64);
    stream.dict.set("BitsPerComponent", 8);
    stream.dict.set(
        "ColorSpace",
        match raster.color_space() {
            SupportedColorSpace::Gray => Object::Name(b"DeviceGray".to_vec()),
            SupportedColorSpace::Rgb => Object::Name(b"DeviceRGB".to_vec()),
            SupportedColorSpace::Cmyk => Object::Name(b"DeviceCMYK".to_vec()),
        },
    );
    stream.dict.remove(b"DecodeParms");
}

fn rewrite_raw(stream: &mut Stream, raster: DecodedRaster) {
    stream.dict.remove(b"Filter");
    normalize_common_dict(stream, &raster);
    stream.set_plain_content(raster.into_raw());
}

fn rewrite_jpeg(stream: &mut Stream, raster: DecodedRaster, quality: u8) -> Result<()> {
    let jpeg = encode_jpeg(&raster, quality)?;

    stream.dict.remove(b"Filter");
    stream.set_content(jpeg);
    stream
        .dict
        .set("Filter", Object::Name(b"DCTDecode".to_vec()));
    normalize_common_dict(stream, &raster);
    Ok(())
}

/// Rewrites a PDF image stream using the provided decoded raster and output encoding.
///
/// Returns the rewritten stream size in bytes.
pub fn rewrite_stream(
    stream: &mut Stream,
    raster: DecodedRaster,
    encoding: OutputEncoding,
) -> Result<usize> {
    match encoding {
        OutputEncoding::Raw => {
            rewrite_raw(stream, raster);
            Ok(stream.content.len())
        }
        OutputEncoding::Jpeg(quality) => {
            rewrite_jpeg(stream, raster, quality)?;
            Ok(stream.content.len())
        }
    }
}

