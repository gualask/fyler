use anyhow::Result;
use image::ExtendedColorType;
use lopdf::{Object, Stream};

use crate::models::OptimizeOptions;

use super::candidate::SupportedColorSpace;
use super::raster::DecodedRaster;

fn encode_jpeg(data: &[u8], width: u32, height: u32, color_type: ExtendedColorType, quality: u8) -> Result<Vec<u8>> {
    use image::ImageEncoder;
    use image::codecs::jpeg::JpegEncoder;

    let mut buf = Vec::with_capacity((width as usize * height as usize) / 8);
    JpegEncoder::new_with_quality(&mut buf, quality).write_image(data, width, height, color_type)?;
    Ok(buf)
}

fn normalize_common_dict(stream: &mut Stream, width: u32, height: u32, color_space: SupportedColorSpace) {
    stream.dict.set("Width", width as i64);
    stream.dict.set("Height", height as i64);
    stream.dict.set("BitsPerComponent", 8);
    stream.dict.set(
        "ColorSpace",
        match color_space {
            SupportedColorSpace::Rgb => Object::Name(b"DeviceRGB".to_vec()),
            SupportedColorSpace::Gray => Object::Name(b"DeviceGray".to_vec()),
        },
    );
}

fn rewrite_raw(stream: &mut Stream, color_space: SupportedColorSpace, raster: DecodedRaster) {
    let width = raster.width();
    let height = raster.height();
    stream.set_plain_content(raster.into_raw());
    normalize_common_dict(stream, width, height, color_space);
}

fn rewrite_jpeg(stream: &mut Stream, color_space: SupportedColorSpace, raster: DecodedRaster, quality: u8) -> Result<()> {
    let width = raster.width();
    let height = raster.height();
    let color_type = match color_space {
        SupportedColorSpace::Rgb => ExtendedColorType::Rgb8,
        SupportedColorSpace::Gray => ExtendedColorType::L8,
    };
    let jpeg = encode_jpeg(&raster.into_raw(), width, height, color_type, quality)?;

    stream.dict.remove(b"DecodeParms");
    stream.dict.remove(b"Filter");
    stream.set_content(jpeg);
    stream.dict.set("Filter", Object::Name(b"DCTDecode".to_vec()));
    normalize_common_dict(stream, width, height, color_space);
    Ok(())
}

pub fn rewrite_stream(
    stream: &mut Stream,
    color_space: SupportedColorSpace,
    raster: DecodedRaster,
    opts: &OptimizeOptions,
) -> Result<()> {
    if let Some(quality) = opts.jpeg_quality {
        rewrite_jpeg(stream, color_space, raster, quality.clamp(1, 100))
    } else {
        rewrite_raw(stream, color_space, raster);
        Ok(())
    }
}
