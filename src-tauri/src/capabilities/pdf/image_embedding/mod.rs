//! Workflow-neutral image layout, rotation, and PDF embedding.
//!
//! The capability deliberately owns the image-export vocabulary used by its
//! implementation. Merge wire contracts are translated at the orchestration
//! boundary before crossing into this module.

mod encode;
mod image_page;
mod layout;
mod policy;
mod positioned_page;
mod rotate;

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
/// Layout rule for embedding a single image as a PDF page.
pub enum ImageFit {
    #[default]
    Fit,
    Contain,
    Cover,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
/// Rotation expressed in clockwise 90-degree steps.
pub enum QuarterTurn {
    #[default]
    Identity,
    Clockwise90,
    HalfTurn,
    Clockwise270,
}

impl QuarterTurn {
    pub const fn degrees(self) -> i32 {
        match self {
            Self::Identity => 0,
            Self::Clockwise90 => 90,
            Self::HalfTurn => 180,
            Self::Clockwise270 => 270,
        }
    }

    pub const fn swaps_dimensions(self) -> bool {
        matches!(self, Self::Clockwise90 | Self::Clockwise270)
    }
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
/// Optional image embedding policy supplied by an owning workflow.
pub struct ImageEmbeddingOptions {
    pub preset: Option<crate::capabilities::raster_compression::CompressionPreset>,
    pub jpeg_quality: Option<u8>,
    pub target_dpi: Option<u16>,
}

pub(crate) use crate::capabilities::raster_compression::{
    source_image_dimensions, source_image_requires_orientation, with_source_image,
};
pub(crate) use encode::prepare_pdf_image;
pub(crate) use image_page::append_image_as_page;
pub(crate) use layout::{image_export_preview_layout, ImageExportPreviewLayout};
pub(crate) use policy::decide_image_embed;
pub(crate) use positioned_page::{append_positioned_images_as_page, PdfRect, PositionedImage};

#[cfg(test)]
mod tests;
