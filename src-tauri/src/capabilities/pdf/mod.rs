//! Workflow-neutral PDF capabilities.

pub(crate) mod composition;
pub(crate) mod image_embedding;
pub(crate) mod metadata;
pub(crate) mod optimization;
pub(crate) mod standalone_compression;

#[cfg(test)]
#[path = "tests/preservation.rs"]
mod preservation_tests;
