//! Workflow-neutral PDF composition primitives.
//!
//! This module provides the building blocks to compose a new PDF from existing PDFs and images.

mod composer;
mod deduplicate;
mod object_copier;
mod page_effective;
mod resources;

pub use composer::PdfComposer;
pub(crate) use deduplicate::deduplicate_large_image_streams;

#[cfg(test)]
mod tests;
