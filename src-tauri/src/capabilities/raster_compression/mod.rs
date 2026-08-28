//! Workflow-neutral raster decoding and transformation primitives.

mod alpha;
mod decode;
mod file_codecs;
mod jpeg;
mod preview;
mod profile;
mod raster;
mod resize;
mod savings;
mod source;
pub(crate) mod standalone;

pub(crate) use alpha::{flatten_to_rgb, flatten_to_white_rgb};
pub(crate) use decode::decode_jpeg;
pub(crate) use jpeg::{encode_jpeg, JpegColor};
pub(crate) use preview::generate_image_preview;
pub(crate) use profile::{resolve_page_profile, CompressionPreset, AUTOMATIC_LOSSY_QUALITY};
pub(crate) use raster::{Raster, RasterColor};
pub(crate) use savings::should_keep_original;
pub(crate) use source::{
    source_image_dimensions, source_image_requires_orientation, validate_raster_layout,
    with_source_image, SourceImageDescriptor, SourceImageFormat, MAX_RASTER_DECODE_BYTES,
};
