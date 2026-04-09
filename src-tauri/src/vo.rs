use serde::{Deserialize, Serialize};

/// Source document kind supported by the app.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum DocKind {
    Pdf,
    Image,
}

impl DocKind {
    pub fn as_str(self) -> &'static str {
        match self {
            DocKind::Pdf => "pdf",
            DocKind::Image => "image",
        }
    }
}

/// Layout rule for single-image exports.
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ImageFit {
    Fit,
    Contain,
    Cover,
}

impl ImageFit {
    pub fn as_str(self) -> &'static str {
        match self {
            ImageFit::Fit => "fit",
            ImageFit::Contain => "contain",
            ImageFit::Cover => "cover",
        }
    }

    /// Parses a frontend-provided string.
    ///
    /// Unknown values are returned as `None` so callers can decide whether to default or fail.
    pub fn parse(value: &str) -> Option<Self> {
        match value {
            "fit" => Some(ImageFit::Fit),
            "contain" => Some(ImageFit::Contain),
            "cover" => Some(ImageFit::Cover),
            _ => None,
        }
    }
}

