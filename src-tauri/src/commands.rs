pub(crate) mod export;
pub(crate) mod sources;
pub(crate) mod support;

use crate::error::{UserFacingError, UserFacingErrorCode};

fn source_not_found_error() -> anyhow::Error {
    anyhow::Error::new(UserFacingError::new(UserFacingErrorCode::SourceNotFound))
}
