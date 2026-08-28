//! In-memory source-registry adapter.
//!
//! This module owns process-local source/path/preview storage. Source import, unlock, and release
//! workflows depend on the source-owned ports in `modules::sources` rather than on this adapter's
//! state representation.

mod file_metadata;
mod registry;
mod source_format;
mod state;

pub(crate) use registry::SourceRegistry;
pub(crate) use source_format::IMAGE_EXTENSIONS;
