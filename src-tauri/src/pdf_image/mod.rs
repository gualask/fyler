//! Image loading and encoding for embedding into PDFs.
//!
//! This module hides image format details behind a small API used by the export pipeline.

mod descriptor;
mod encode;
mod policy;

pub use descriptor::load_source_image;
pub use encode::prepare_pdf_image;
pub use policy::decide_image_embed;
