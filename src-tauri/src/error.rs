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

/// Stable codes understood by the frontend's user-facing error formatter.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum UserFacingErrorCode {
    PageOutOfRange,
    SourceNotFound,
    OpenPdfFailed,
    InvalidPdfPassword,
    NoDocumentsToMerge,
    PageMissingMediabox,
    InvalidExportItemKind,
    ExternalUrlNotAllowed,
    OutputPathNotAuthorized,
}

impl UserFacingErrorCode {
    pub const fn as_str(self) -> &'static str {
        match self {
            Self::PageOutOfRange => "page_out_of_range",
            Self::SourceNotFound => "source_not_found",
            Self::OpenPdfFailed => "open_pdf_failed",
            Self::InvalidPdfPassword => "invalid_pdf_password",
            Self::NoDocumentsToMerge => "no_documents_to_merge",
            Self::PageMissingMediabox => "page_missing_mediabox",
            Self::InvalidExportItemKind => "invalid_export_item_kind",
            Self::ExternalUrlNotAllowed => "external_url_not_allowed",
            Self::OutputPathNotAuthorized => "output_path_not_authorized",
        }
    }
}

/// An error intended to be surfaced to the user (via a stable error `code`).
///
/// Wrap this inside `anyhow::Error` so it can carry rich context while still producing a
/// frontend-friendly `{ code, message, meta }` payload.
#[derive(Debug)]
pub struct UserFacingError {
    pub code: UserFacingErrorCode,
    pub meta: Option<Value>,
}

impl UserFacingError {
    /// Creates a new user-facing error with no metadata.
    pub fn new(code: UserFacingErrorCode) -> Self {
        Self { code, meta: None }
    }

    /// Creates a new user-facing error with structured metadata for UI/support diagnostics.
    pub fn with_meta(code: UserFacingErrorCode, meta: Value) -> Self {
        Self {
            code,
            meta: Some(meta),
        }
    }
}

impl fmt::Display for UserFacingError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        f.write_str(self.code.as_str())
    }
}

impl std::error::Error for UserFacingError {}

impl serde::Serialize for AppError {
    fn serialize<S: serde::Serializer>(&self, s: S) -> Result<S::Ok, S::Error> {
        let (code, message, meta) = match self {
            AppError::Anyhow(err) => {
                if let Some(user) = err.downcast_ref::<UserFacingError>() {
                    (user.code.as_str(), err.to_string(), user.meta.as_ref())
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

#[cfg(test)]
mod tests {
    use super::UserFacingErrorCode;

    #[test]
    fn user_facing_error_codes_keep_the_wire_contract() {
        let cases = [
            (UserFacingErrorCode::PageOutOfRange, "page_out_of_range"),
            (UserFacingErrorCode::SourceNotFound, "source_not_found"),
            (UserFacingErrorCode::OpenPdfFailed, "open_pdf_failed"),
            (
                UserFacingErrorCode::InvalidPdfPassword,
                "invalid_pdf_password",
            ),
            (
                UserFacingErrorCode::NoDocumentsToMerge,
                "no_documents_to_merge",
            ),
            (
                UserFacingErrorCode::PageMissingMediabox,
                "page_missing_mediabox",
            ),
            (
                UserFacingErrorCode::InvalidExportItemKind,
                "invalid_export_item_kind",
            ),
            (
                UserFacingErrorCode::ExternalUrlNotAllowed,
                "external_url_not_allowed",
            ),
            (
                UserFacingErrorCode::OutputPathNotAuthorized,
                "output_path_not_authorized",
            ),
        ];

        for (code, expected) in cases {
            assert_eq!(code.as_str(), expected);
        }
    }
}
