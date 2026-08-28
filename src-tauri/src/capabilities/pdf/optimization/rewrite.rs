use anyhow::Result;
use lopdf::{Object, Stream};

use crate::capabilities::raster_compression::{encode_jpeg, JpegColor, Raster, RasterColor};

use super::plan::OutputEncoding;

fn jpeg_color(color: RasterColor) -> JpegColor {
    match color {
        RasterColor::Gray => JpegColor::Luma,
        RasterColor::Rgb => JpegColor::Rgb,
        RasterColor::Rgba => unreachable!("PDF optimization does not produce RGBA rasters"),
        RasterColor::Cmyk => JpegColor::Cmyk,
    }
}

fn encode_raster_as_jpeg(raster: &Raster, quality: u8) -> Result<Vec<u8>> {
    encode_jpeg(
        raster.data(),
        raster.width(),
        raster.height(),
        jpeg_color(raster.color()),
        quality,
    )
}

fn normalize_common_dict(stream: &mut Stream, raster: &Raster) {
    stream.dict.set("Width", raster.width() as i64);
    stream.dict.set("Height", raster.height() as i64);
    stream.dict.set("BitsPerComponent", 8);
    stream.dict.set(
        "ColorSpace",
        match raster.color() {
            RasterColor::Gray => Object::Name(b"DeviceGray".to_vec()),
            RasterColor::Rgb => Object::Name(b"DeviceRGB".to_vec()),
            RasterColor::Rgba => unreachable!("PDF optimization does not produce RGBA rasters"),
            RasterColor::Cmyk => Object::Name(b"DeviceCMYK".to_vec()),
        },
    );
    stream.dict.remove(b"DecodeParms");
}

fn rewrite_raw(stream: &mut Stream, raster: Raster) {
    stream.dict.remove(b"Filter");
    normalize_common_dict(stream, &raster);
    stream.set_plain_content(raster.into_data());
}

fn rewrite_jpeg(stream: &mut Stream, raster: Raster, quality: u8) -> Result<()> {
    let jpeg = encode_raster_as_jpeg(&raster, quality)?;

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
    raster: Raster,
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
