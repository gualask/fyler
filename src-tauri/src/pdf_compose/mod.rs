//! PDF composition primitives.
//!
//! This module provides the building blocks to compose a new PDF from existing PDFs and images.

mod composer;
mod object_copier;
mod page_effective;
mod resources;

pub use composer::PdfComposer;
