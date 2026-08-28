/// Source document kind supported by the import workflow.
#[derive(Debug, Clone, Copy, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DocKind {
    Pdf,
    Image,
}

impl DocKind {
    pub fn as_str(self) -> &'static str {
        match self {
            Self::Pdf => "pdf",
            Self::Image => "image",
        }
    }
}

/// A user-imported file tracked by the current session.
#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SourceFile {
    /// Stable ID generated on import (used by the frontend to reference this source).
    pub id: String,
    #[serde(rename = "originalPath")]
    /// Original filesystem path.
    pub original_path: String,
    /// Display name (typically filename).
    pub name: String,
    #[serde(rename = "byteSize")]
    /// Original file size in bytes.
    pub byte_size: u64,
    #[serde(rename = "pageCount")]
    /// Total page count for PDFs (`None` while being counted in background), or `Some(1)` for images.
    pub page_count: Option<u32>,
    /// `"pdf"` or `"image"`.
    pub kind: DocKind,
}

/// A PDF that could not be imported until the user provides a password.
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct PasswordProtectedFile {
    #[serde(rename = "originalPath")]
    pub original_path: String,
    pub name: String,
    #[serde(rename = "byteSize")]
    pub byte_size: u64,
}

/// A single file that was skipped during import, plus a reason code for the UI.
#[derive(serde::Serialize, Clone, Copy, Debug, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum SkippedFileReason {
    UnsupportedFormat,
    ReadError,
    PathError,
}

/// A single file that was skipped during import, plus a reason suitable for UI messaging.
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkippedFile {
    pub name: String,
    pub reason: SkippedFileReason,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// Successful import result returned to the frontend.
#[derive(serde::Serialize)]
pub struct OpenFilesResult {
    pub files: Vec<SourceFile>,
    #[serde(rename = "passwordRequired")]
    pub password_required: Vec<PasswordProtectedFile>,
    #[serde(rename = "skippedErrors")]
    pub skipped_errors: Vec<SkippedFile>,
}

/// Source contract tests stay next to the source-owned wire types.
#[cfg(test)]
mod tests {
    use super::{DocKind, OpenFilesResult, PasswordProtectedFile, SkippedFileReason, SourceFile};

    #[test]
    fn skipped_file_reasons_keep_the_wire_contract() {
        let cases = [
            (SkippedFileReason::UnsupportedFormat, "unsupported_format"),
            (SkippedFileReason::ReadError, "read_error"),
            (SkippedFileReason::PathError, "path_error"),
        ];

        for (reason, expected) in cases {
            assert_eq!(serde_json::to_value(reason).unwrap(), expected);
        }
    }

    #[test]
    fn source_import_commands_keep_camel_case_payloads() {
        let source = SourceFile {
            id: "source-1".to_string(),
            original_path: "/tmp/source.pdf".to_string(),
            name: "source.pdf".to_string(),
            byte_size: 12,
            page_count: Some(2),
            kind: DocKind::Pdf,
        };
        let pending = PasswordProtectedFile {
            original_path: "/tmp/locked.pdf".to_string(),
            name: "locked.pdf".to_string(),
            byte_size: 34,
        };
        let result = OpenFilesResult {
            files: vec![source],
            password_required: vec![pending],
            skipped_errors: vec![],
        };

        assert_eq!(
            serde_json::to_value(result).unwrap(),
            serde_json::json!({
                "files": [{
                    "id": "source-1",
                    "originalPath": "/tmp/source.pdf",
                    "name": "source.pdf",
                    "byteSize": 12,
                    "pageCount": 2,
                    "kind": "pdf"
                }],
                "passwordRequired": [{
                    "originalPath": "/tmp/locked.pdf",
                    "name": "locked.pdf",
                    "byteSize": 34
                }],
                "skippedErrors": []
            })
        );
    }
}
