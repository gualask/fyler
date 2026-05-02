use anyhow::Result;
use lopdf::Document as PdfDoc;

use crate::vo::DocKind;

/// File extensions treated as images during import.
///
/// The list is compared case-insensitively against the path extension.
pub const IMAGE_EXTENSIONS: &[&str] = &[
    "png", "jpg", "jpeg", "gif", "tiff", "tif", "webp", "bmp", "ico", "tga", "qoi",
];

fn is_image_path(path: &str) -> bool {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();
    IMAGE_EXTENSIONS.contains(&ext.as_str())
}

/// Detects the document kind from the file extension.
///
/// Returns `"pdf"`, `"image"`, or `None` when the extension is unsupported.
pub fn detect_kind_from_ext(path: &str) -> Option<DocKind> {
    if is_image_path(path) {
        Some(DocKind::Image)
    } else if path.to_lowercase().ends_with(".pdf") {
        Some(DocKind::Pdf)
    } else {
        None
    }
}

/// Counts the number of pages in a PDF at `path`.
pub fn count_pages(path: &str) -> Result<u32> {
    Ok(PdfDoc::load(path)?.get_pages().len() as u32)
}
