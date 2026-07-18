//! PDF/image helper utilities used by import and export.
//!
//! This module intentionally exposes a small API surface via re-exports.

mod image_page;
mod layout;
mod metadata;
mod rotate;

pub use image_page::append_image_as_page;
pub use layout::{image_export_preview_layout, ImageExportPreviewLayout};
pub use metadata::{count_pages, count_pages_with_password, is_password_required_error};

#[cfg(test)]
mod tests;
