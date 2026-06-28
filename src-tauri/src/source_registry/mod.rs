//! Source registry and import helpers.
//!
//! The registry tracks imported sources by ID so export can resolve file paths without the
//! frontend re-sending full metadata on every request.

mod import;
mod preview;
mod registry;
mod source_registration;

pub use import::{files_from_paths, FilesFromPathsResult};
pub use registry::{RegisteredSource, SourceRegistry};
pub(crate) use source_registration::unlocked_pdf_source;

#[cfg(test)]
mod tests;
