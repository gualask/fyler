use serde::{Deserialize, Serialize};

use crate::capabilities::raster_compression::{
    standalone::StandaloneImageOutputMode, CompressionPreset,
};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BatchCompressionRequest {
    pub destination_path: String,
    pub files: Vec<BatchFileRequest>,
    pub settings: BatchCompressionSettings,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BatchFileRequest {
    pub source_id: String,
    pub source_path: String,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BatchCompressionSettings {
    pub preset: CompressionPreset,
    pub image_output_mode: StandaloneImageOutputMode,
    pub jpeg_quality: Option<u8>,
    pub jpeg_background: [u8; 3],
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct PixelDimensions {
    pub width: u32,
    pub height: u32,
}

impl From<(u32, u32)> for PixelDimensions {
    fn from((width, height): (u32, u32)) -> Self {
        Self { width, height }
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum BatchFileStatus {
    Compressed,
    AlreadyOptimized,
    Skipped,
    Failed,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) enum BatchSkipReason {
    UnsupportedFormat,
    AnimatedWebP,
    ProtectedPdf,
    DigitallySignedPdf,
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BatchFileResult {
    pub source_id: String,
    pub source_path: String,
    pub output_path: Option<String>,
    pub status: BatchFileStatus,
    pub skip_reason: Option<BatchSkipReason>,
    pub message: Option<String>,
    pub original_bytes: Option<u64>,
    pub output_bytes: Option<u64>,
    pub original_dimensions: Option<PixelDimensions>,
    pub output_dimensions: Option<PixelDimensions>,
    pub page_count: Option<u32>,
}

#[derive(Debug, Clone, Copy, Default, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BatchSummary {
    pub compressed: usize,
    pub already_optimized: usize,
    pub skipped: usize,
    pub failed: usize,
    pub original_bytes: u64,
    pub output_bytes: u64,
}

impl BatchSummary {
    pub(super) fn from_results(results: &[BatchFileResult]) -> Self {
        let mut summary = Self::default();
        for result in results {
            match result.status {
                BatchFileStatus::Compressed => summary.compressed += 1,
                BatchFileStatus::AlreadyOptimized => summary.already_optimized += 1,
                BatchFileStatus::Skipped => summary.skipped += 1,
                BatchFileStatus::Failed => summary.failed += 1,
            }
            summary.original_bytes = summary
                .original_bytes
                .saturating_add(result.original_bytes.unwrap_or(0));
            summary.output_bytes = summary
                .output_bytes
                .saturating_add(result.output_bytes.unwrap_or(0));
        }
        summary
    }
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize)]
#[serde(rename_all = "camelCase")]
pub(crate) struct BatchCompressionResult {
    pub files: Vec<BatchFileResult>,
    pub summary: BatchSummary,
}
