//! PDF/image helper utilities used by import and export.
//!
//! This module intentionally exposes a small API surface via re-exports.

mod image_page;
mod kind;
mod layout;
mod rotate;

pub use image_page::append_image_as_page;
pub use kind::{count_pages, detect_kind_from_ext, IMAGE_EXTENSIONS};
pub use layout::{image_export_preview_layout, ImageExportPreviewLayout};
pub use rotate::{quarter_turns_to_degrees, validate_quarter_turns};

#[cfg(test)]
mod tests;
