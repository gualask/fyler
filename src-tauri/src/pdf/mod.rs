//! PDF/image helper utilities used by import and export.
//!
//! This module intentionally exposes a small API surface via re-exports.

mod image_page;
mod kind;
mod layout;
mod rotate;

pub use image_page::append_image_as_page;
pub use kind::{
    count_pages, count_pages_with_password, detect_kind_from_ext, is_password_required_error,
    IMAGE_EXTENSIONS,
};
pub use layout::{image_export_preview_layout, ImageExportPreviewLayout};

#[cfg(test)]
mod tests;
