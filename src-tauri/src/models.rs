use std::collections::HashMap;

#[derive(serde::Serialize, serde::Deserialize, Clone)]
pub struct SourceFile {
    pub id: String,
    #[serde(rename = "originalPath")]
    pub original_path: String,
    pub name: String,
    #[serde(rename = "pageCount")]
    pub page_count: u32,
    pub kind: String,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct ExportPage {
    #[serde(rename = "fileId")]
    pub file_id: String,
    #[serde(rename = "pageNum")]
    pub page_num: u32,
}

#[derive(serde::Serialize, serde::Deserialize, Clone, Default)]
pub struct FileEdits {
    #[serde(default)]
    pub revision: u32,
    #[serde(rename = "pageRotations", default)]
    pub page_rotations: HashMap<String, u8>,
    #[serde(rename = "imageRotation", default)]
    pub image_rotation: Option<u8>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct OptimizeOptions {
    #[serde(rename = "jpegQuality")]
    pub jpeg_quality: Option<u8>, // 1..=100
    #[serde(rename = "targetDpi")]
    pub target_dpi: Option<u16>,
    #[serde(rename = "imageFit")]
    pub image_fit: Option<String>, // "fit" | "contain" | "cover"
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MergeRequest {
    pub pages: Vec<ExportPage>,
    #[serde(default)]
    pub edits: HashMap<String, FileEdits>,
    #[serde(rename = "outputPath")]
    pub output_path: String,
    pub optimize: Option<OptimizeOptions>,
}

#[derive(serde::Serialize, serde::Deserialize)]
pub struct MergeResult {
    #[serde(rename = "optimizationFailedCount")]
    pub optimization_failed_count: usize,
}
