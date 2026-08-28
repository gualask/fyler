use anyhow::{Context, Result};
use image::{metadata::Orientation, ImageDecoder, ImageReader};

use super::{
    image_decode_guard, image_decode_limits, read_webp_bytes, validate_image_dimensions,
    validate_source_image_file_size,
};

pub(super) fn webp_dimensions_and_bytes(path: &str) -> Result<((u32, u32), Vec<u8>)> {
    let bytes = read_webp_bytes(path)?;
    let info = webpx::ImageInfo::from_webp(&bytes).map_err(|error| anyhow::anyhow!("{error}"))?;
    validate_image_dimensions(info.width, info.height)?;
    Ok(((info.width, info.height), bytes))
}

fn orientation_swaps_dimensions(orientation: Orientation) -> bool {
    matches!(
        orientation,
        Orientation::Rotate90
            | Orientation::Rotate270
            | Orientation::Rotate90FlipH
            | Orientation::Rotate270FlipH
    )
}

fn oriented_dimensions(dimensions: (u32, u32), orientation: Orientation) -> (u32, u32) {
    if orientation_swaps_dimensions(orientation) {
        (dimensions.1, dimensions.0)
    } else {
        dimensions
    }
}

pub(super) fn webp_orientation(bytes: &[u8]) -> Result<Orientation> {
    Ok(webpx::get_exif(bytes)
        .map_err(|error| anyhow::anyhow!("failed to read WebP EXIF metadata: {error}"))?
        .and_then(|exif| Orientation::from_exif_chunk(&exif))
        .unwrap_or(Orientation::NoTransforms))
}

fn generic_image_metadata(path: &str) -> Result<((u32, u32), Orientation)> {
    validate_source_image_file_size(path)?;
    let mut reader = ImageReader::open(path)
        .context("Failed to open image")?
        .with_guessed_format()
        .context("Failed to detect image format")?;
    reader.limits(image_decode_limits());
    let mut decoder = reader
        .into_decoder()
        .context("Failed to initialize image decoder")?;
    let dimensions = decoder.dimensions();
    validate_image_dimensions(dimensions.0, dimensions.1)?;
    let orientation = decoder
        .orientation()
        .context("Failed to read image orientation")?;
    Ok((dimensions, orientation))
}

fn source_image_metadata(path: &str) -> Result<((u32, u32), Orientation)> {
    if path.to_ascii_lowercase().ends_with(".webp") {
        let (dimensions, bytes) = webp_dimensions_and_bytes(path)?;
        return Ok((dimensions, webp_orientation(&bytes)?));
    }
    generic_image_metadata(path)
}

/// Reads source dimensions under the same resource gate used by full image decodes.
pub(crate) fn source_image_dimensions(path: &str) -> Result<(u32, u32)> {
    let _guard = image_decode_guard();
    let (dimensions, orientation) = source_image_metadata(path)?;
    Ok(oriented_dimensions(dimensions, orientation))
}

/// Reports whether decoding must apply a metadata transform before user edits.
pub(crate) fn source_image_requires_orientation(path: &str) -> Result<bool> {
    let _guard = image_decode_guard();
    Ok(source_image_metadata(path)?.1 != Orientation::NoTransforms)
}
