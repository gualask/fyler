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
    count_pages_with_password(path, None)
}

/// Counts the number of pages in a PDF, using `password` for encrypted sources when provided.
pub fn count_pages_with_password(path: &str, password: Option<&str>) -> Result<u32> {
    // Since lopdf 0.43, the password-less metadata loader reports encrypted
    // documents without failing. Supplying an explicit empty password keeps
    // empty-password PDFs readable while surfacing InvalidPassword when user
    // input is actually required.
    let metadata = PdfDoc::load_metadata_with_password(path, password.unwrap_or_default())?;
    Ok(metadata.page_count)
}

/// Returns true when a PDF open/count error indicates that a password is needed.
pub fn is_password_required_error(error: &anyhow::Error) -> bool {
    let Some(pdf_error) = error.downcast_ref::<lopdf::Error>() else {
        return false;
    };

    match pdf_error {
        lopdf::Error::InvalidPassword
        | lopdf::Error::UnsupportedSecurityHandler(_)
        | lopdf::Error::Decryption(_) => true,
        lopdf::Error::Unimplemented(message)
            if message.contains("encrypted") && message.contains("password") =>
        {
            true
        }
        _ => false,
    }
}
