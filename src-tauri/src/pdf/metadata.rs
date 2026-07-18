use anyhow::Result;
use lopdf::Document as PdfDoc;

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
