use serde::ser::SerializeStruct;
use serde_json::Value;
use std::fmt;

/// Top-level error type returned by Tauri commands.
///
/// The frontend receives a stable payload `{ code, message, meta }` via the custom `Serialize`
/// implementation below.
#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error(transparent)]
    Anyhow(#[from] anyhow::Error),
}

/// An error intended to be surfaced to the user (via a stable error `code`).
///
/// Wrap this inside `anyhow::Error` so it can carry rich context while still producing a
/// frontend-friendly `{ code, message, meta }` payload.
#[derive(Debug)]
pub struct UserFacingError {
    pub code: &'static str,
    pub meta: Option<Value>,
}

impl UserFacingError {
    /// Creates a new user-facing error with no metadata.
    pub fn new(code: &'static str) -> Self {
        Self { code, meta: None }
    }

    /// Creates a new user-facing error with structured metadata for UI/support diagnostics.
    pub fn with_meta(code: &'static str, meta: Value) -> Self {
        Self {
            code,
            meta: Some(meta),
        }
    }
}

impl fmt::Display for UserFacingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{}", self.code)
    }
}

impl std::error::Error for UserFacingError {}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let (code, message, meta) = match self {
            AppError::Anyhow(err) => {
                if let Some(user) = err.downcast_ref::<UserFacingError>() {
                    (user.code, err.to_string(), user.meta.as_ref())
                } else {
                    ("unknown", err.to_string(), None)
                }
            }
        };

        let mut st = s.serialize_struct("AppError", 3)?;
        st.serialize_field("code", code)?;
        st.serialize_field("message", &message)?;
        st.serialize_field("meta", &meta)?;
        st.end()
    }
}
