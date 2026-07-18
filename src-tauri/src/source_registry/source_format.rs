use crate::vo::DocKind;

/// File extensions treated as images during import.
///
/// The list is compared case-insensitively against the path extension.
pub(crate) const IMAGE_EXTENSIONS: &[&str] = &[
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
/// Returns `Pdf`, `Image`, or `None` when the extension is unsupported.
pub(super) fn detect_kind_from_ext(path: &str) -> Option<DocKind> {
    if is_image_path(path) {
        Some(DocKind::Image)
    } else if path.to_lowercase().ends_with(".pdf") {
        Some(DocKind::Pdf)
    } else {
        None
    }
}
