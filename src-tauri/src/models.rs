use std::collections::HashMap;

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
    #[serde(rename = "pageCount")]
    /// Total page count for PDFs, or `1` for images.
    pub page_count: u32,
    /// `"pdf"` or `"image"`.
    pub kind: String,
}

/// A single item in the export sequence (source file + page number).
#[derive(serde::Serialize, serde::Deserialize)]
pub struct ExportPage {
    #[serde(rename = "fileId")]
    pub file_id: String,
    #[serde(rename = "pageNum")]
    /// 1-based page number in the source PDF.
    pub page_num: u32,
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
    pub page_rotations: HashMap<u32, u8>,
    #[serde(rename = "imageRotation", default)]
    /// Image rotation in quarter-turns (`0..=3`).
    pub image_rotation: u8,
}

/// Optional export-time optimizations.
#[derive(serde::Serialize, serde::Deserialize)]
pub struct OptimizeOptions {
    #[serde(rename = "jpegQuality")]
    /// JPEG quality in `1..=100` (None means keep original if possible).
    pub jpeg_quality: Option<u8>, // 1..=100
    #[serde(rename = "targetDpi")]
    /// Target raster DPI (used for resizing embedded images).
    pub target_dpi: Option<u16>,
    #[serde(rename = "imageFit")]
    /// Layout rule for single-image exports: `"fit" | "contain" | "cover"`.
    pub image_fit: Option<String>, // "fit" | "contain" | "cover"
}

/// Export request emitted by the frontend.
#[derive(serde::Serialize, serde::Deserialize)]
pub struct MergeRequest {
    /// Final ordered list of pages to export.
    pub pages: Vec<ExportPage>,
    #[serde(default)]
    /// Edits keyed by `file_id`.
    pub edits: HashMap<String, FileEdits>,
    #[serde(rename = "outputPath")]
    /// Destination file path chosen by the user.
    pub output_path: String,
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

/// A single file that was skipped during import, plus a reason code for the UI.
#[derive(serde::Serialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct SkippedFile {
    pub name: String,
    pub reason: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
}

/// Successful import result returned to the frontend.
#[derive(serde::Serialize)]
pub struct OpenFilesResult {
    pub files: Vec<SourceFile>,
    #[serde(rename = "skippedErrors")]
    pub skipped_errors: Vec<SkippedFile>,
}
