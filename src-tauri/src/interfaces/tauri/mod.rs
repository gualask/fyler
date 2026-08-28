//! Tauri command adapters.
//!
//! Every public command name remains in this module tree.  Adapters validate transport-specific
//! inputs, authorize runtime resources, and delegate one operation to its owning module.

pub(crate) mod batch_compression;
pub(crate) mod export;
pub(crate) mod page_composition;
pub(crate) mod settings;
pub(crate) mod sources;
pub(crate) mod support;

use crate::shared::error::{UserFacingError, UserFacingErrorCode};

pub(crate) fn source_not_found_error() -> anyhow::Error {
    anyhow::Error::new(UserFacingError::new(UserFacingErrorCode::SourceNotFound))
}
