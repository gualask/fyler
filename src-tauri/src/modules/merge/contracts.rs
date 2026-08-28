use std::collections::HashMap;

use serde::de::Error as _;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

/// Rotation supplied by the merge wire contract, expressed in clockwise 90-degree steps.
///
/// The image-embedding capability owns a separate workflow-neutral rotation value. Merge maps
/// this transport value to that capability value at its boundary.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub enum QuarterTurn {
    #[default]
    Identity,
    Clockwise90,
    HalfTurn,
    Clockwise270,
}

impl QuarterTurn {
    const fn as_u8(self) -> u8 {
        match self {
            Self::Identity => 0,
            Self::Clockwise90 => 1,
            Self::HalfTurn => 2,
            Self::Clockwise270 => 3,
        }
    }
}

impl Serialize for QuarterTurn {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: Serializer,
    {
        serializer.serialize_u8(self.as_u8())
    }
}

impl<'de> Deserialize<'de> for QuarterTurn {
    fn deserialize<D>(deserializer: D) -> Result<Self, D::Error>
    where
        D: Deserializer<'de>,
    {
        match u8::deserialize(deserializer)? {
            0 => Ok(Self::Identity),
            1 => Ok(Self::Clockwise90),
            2 => Ok(Self::HalfTurn),
            3 => Ok(Self::Clockwise270),
            value => Err(D::Error::custom(format!(
                "quarter turn must be between 0 and 3, got {value}"
            ))),
        }
    }
}

/// Layout rule for embedding a single imported image as a PDF page.
///
/// This is part of the merge wire contract. The image-embedding capability has its own
/// workflow-neutral `ImageFit` input and the merge boundary maps this value explicitly.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ImageFit {
    #[default]
    Fit,
    Contain,
    Cover,
}

/// A single item in the export sequence.
#[derive(serde::Serialize, serde::Deserialize, Clone)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum ExportItem {
    /// A single page from a PDF source.
    Pdf {
        #[serde(rename = "fileId")]
        file_id: String,
        #[serde(rename = "pageNum")]
        /// 1-based page number in the source PDF.
        page_num: u32,
    },
    /// A single image source (always exports as a single page).
    Image {
        #[serde(rename = "fileId")]
        file_id: String,
    },
}

/// Per-source edits applied by the user.
///
/// `revision` is bumped on every edit to make cache invalidation easy on the frontend.
#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
pub struct FileEdits {
    #[serde(default)]
    pub revision: u32,
    #[serde(rename = "pageRotations", default)]
    /// Sparse map of per-page rotations in quarter-turns (`0..=3`).
    pub page_rotations: HashMap<u32, QuarterTurn>,
    #[serde(rename = "imageRotation", default)]
    /// Image rotation in quarter-turns (`0..=3`).
    pub image_rotation: QuarterTurn,
}

/// Optional export-time optimizations.
#[derive(serde::Serialize, serde::Deserialize)]
pub struct OptimizeOptions {
    /// Named automatic profile. Missing means the numeric fields are manual overrides.
    pub preset: Option<crate::capabilities::raster_compression::CompressionPreset>,
    #[serde(rename = "jpegQuality")]
    /// JPEG quality in `1..=100` (None means keep original if possible).
    pub jpeg_quality: Option<u8>, // 1..=100
    #[serde(rename = "targetDpi")]
    /// Target raster DPI (used for resizing embedded images).
    pub target_dpi: Option<u16>,
}

/// Export request emitted by the frontend.
#[derive(serde::Serialize, serde::Deserialize)]
pub struct MergeRequest {
    /// Final ordered list of pages to export.
    pub pages: Vec<ExportItem>,
    #[serde(default)]
    /// Edits keyed by `file_id`.
    pub edits: HashMap<String, FileEdits>,
    #[serde(rename = "outputPath")]
    /// Destination file path chosen by the user.
    pub output_path: String,
    #[serde(rename = "imageFit", default)]
    /// Layout rule applied when an imported image becomes a PDF page.
    pub image_fit: ImageFit,
    /// Optional image optimization settings.
    pub optimize: Option<OptimizeOptions>,
}

/// Export result returned to the frontend.
#[derive(serde::Serialize, serde::Deserialize)]
pub struct MergeResult {
    #[serde(rename = "optimizationFailedCount")]
    /// Number of images that failed optimization but did not abort the export.
    pub optimization_failed_count: usize,
}

#[cfg(test)]
mod tests {
    use super::{ImageFit, MergeRequest, QuarterTurn};
    use crate::capabilities::raster_compression::CompressionPreset;

    #[test]
    fn quarter_turn_round_trips_as_a_number() {
        for (value, expected) in [
            (0, QuarterTurn::Identity),
            (1, QuarterTurn::Clockwise90),
            (2, QuarterTurn::HalfTurn),
            (3, QuarterTurn::Clockwise270),
        ] {
            let turn: QuarterTurn = serde_json::from_value(serde_json::json!(value))
                .expect("valid quarter turn should deserialize");
            assert_eq!(turn, expected);
            assert_eq!(
                serde_json::to_value(turn).unwrap(),
                serde_json::json!(value)
            );
        }
    }

    #[test]
    fn quarter_turn_rejects_out_of_range_values() {
        assert!(serde_json::from_value::<QuarterTurn>(serde_json::json!(4)).is_err());
    }

    #[test]
    fn merge_request_defaults_missing_image_fit_to_fit() {
        let request: MergeRequest = serde_json::from_value(serde_json::json!({
            "pages": [],
            "edits": {},
            "outputPath": "/tmp/fyler-test-output.pdf"
        }))
        .expect("missing imageFit should use the backend default");

        assert_eq!(request.image_fit, ImageFit::Fit);
    }

    #[test]
    fn merge_request_deserializes_named_compression_profile() {
        let request: MergeRequest = serde_json::from_value(serde_json::json!({
            "pages": [],
            "edits": {},
            "outputPath": "/tmp/fyler-test-output.pdf",
            "optimize": { "preset": "balanced" }
        }))
        .expect("named preset should deserialize");

        assert_eq!(
            request.optimize.and_then(|options| options.preset),
            Some(CompressionPreset::Balanced)
        );
    }

    #[test]
    fn merge_request_rejects_unknown_image_fit() {
        let result = serde_json::from_value::<MergeRequest>(serde_json::json!({
            "pages": [],
            "edits": {},
            "outputPath": "/tmp/fyler-test-output.pdf",
            "imageFit": "sideways"
        }));

        assert!(result.is_err());
    }

    #[test]
    fn merge_request_deserializes_known_image_fit() {
        let request: MergeRequest = serde_json::from_value(serde_json::json!({
            "pages": [],
            "edits": {},
            "outputPath": "/tmp/fyler-test-output.pdf",
            "imageFit": "contain"
        }))
        .expect("known imageFit should deserialize");

        assert_eq!(request.image_fit, ImageFit::Contain);
    }
}
