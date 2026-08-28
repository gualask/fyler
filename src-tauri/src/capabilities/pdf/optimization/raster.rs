use anyhow::Result;
use lopdf::Stream;

use crate::capabilities::raster_compression::{
    decode_jpeg as decode_jpeg_bytes, Raster, RasterColor,
};

use super::candidate::{ImageCandidate, SourceEncoding, SupportedColorSpace};

fn raster_color(color_space: SupportedColorSpace) -> RasterColor {
    match color_space {
        SupportedColorSpace::Gray => RasterColor::Gray,
        SupportedColorSpace::Rgb => RasterColor::Rgb,
        SupportedColorSpace::Cmyk => RasterColor::Cmyk,
    }
}

/// Decodes an embedded PDF image stream into a workflow-neutral raster.
pub fn decode_raster(
    stream: &Stream,
    candidate: &ImageCandidate,
    resize_to: Option<(u32, u32)>,
) -> Result<Raster> {
    match candidate.source_encoding {
        SourceEncoding::Raw => decode_raw(stream, candidate),
        SourceEncoding::Jpeg => decode_jpeg_stream(stream, candidate, resize_to),
    }
}

fn decode_raw(stream: &Stream, candidate: &ImageCandidate) -> Result<Raster> {
    let expected_len =
        candidate.width as usize * candidate.height as usize * candidate.color_space.components();
    let raw = stream.get_plain_content_with_limit(expected_len)?;
    if raw.len() != expected_len {
        anyhow::bail!("decoded raster length mismatch");
    }

    Ok(Raster::new(
        candidate.width,
        candidate.height,
        raster_color(candidate.color_space),
        raw,
    ))
}

fn decode_jpeg_stream(
    stream: &Stream,
    candidate: &ImageCandidate,
    resize_to: Option<(u32, u32)>,
) -> Result<Raster> {
    decode_jpeg_bytes(
        &stream.content,
        raster_color(candidate.color_space),
        resize_to,
    )
}
