//! Merge workflow backend.
//!
//! The module owns merge wire contracts and the export use case. PDF composition, image
//! embedding, and optimization remain workflow-neutral capabilities; this module maps its wire
//! values to those capability inputs at the boundary.

mod compose;
mod contracts;
mod export;
mod ports;
mod preview;
mod progress;
mod source_cache;

pub(crate) use contracts::{
    ExportItem, FileEdits, ImageFit, MergeRequest, MergeResult, OptimizeOptions, QuarterTurn,
};
pub(crate) use export::export_pdf;
pub(crate) use ports::OutputWriter;
pub(crate) use preview::image_export_preview_layout;
pub(crate) use progress::ProgressSink;
