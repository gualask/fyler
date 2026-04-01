//! Source registry and import helpers.
//!
//! The registry tracks imported sources by ID so export can resolve file paths without the
//! frontend re-sending full metadata on every request.

mod import;
mod registry;

pub use import::{files_from_paths, FilesFromPathsResult};
pub use registry::{RegisteredSource, SourceRegistry};

#[cfg(test)]
mod tests;
