use crate::capabilities::pdf::metadata::{count_pages_with_password, is_password_required_error};
use crate::shared::error::{UserFacingError, UserFacingErrorCode};

use super::contracts::{DocKind, SourceFile};
use super::ports::{RegisteredSource, SourceImport, SourceLifecycle, SourceRegistration};

fn unlock_error(error: anyhow::Error) -> anyhow::Error {
    if is_password_required_error(&error) {
        anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::InvalidPdfPassword,
        ))
    } else {
        anyhow::Error::new(UserFacingError::new(UserFacingErrorCode::OpenPdfFailed))
    }
}

fn unlocked_pdf_registration<R: SourceImport>(
    registry: &R,
    path: String,
    password: String,
) -> anyhow::Result<SourceRegistration> {
    let name = registry.source_file_name(&path);
    let byte_size = registry.source_byte_size(&path);
    let page_count = count_pages_with_password(&path, Some(&password)).map_err(unlock_error)?;
    let id = uuid::Uuid::new_v4().to_string();

    Ok(SourceRegistration {
        source: SourceFile {
            id,
            original_path: path.clone(),
            name,
            byte_size,
            page_count: Some(page_count),
            kind: DocKind::Pdf,
        },
        registered: RegisteredSource {
            original_path: path,
            kind: DocKind::Pdf,
            password: Some(password),
        },
    })
}

/// Unlocks and atomically registers one password-protected PDF.
pub fn unlock_pdf_source<R: SourceLifecycle + SourceImport>(
    registry: &R,
    path: String,
    password: String,
) -> anyhow::Result<SourceFile> {
    if !registry.begin_unlock(&path) {
        return Err(anyhow::Error::new(UserFacingError::new(
            UserFacingErrorCode::SourceNotFound,
        )));
    }

    let pending_path = path.clone();
    let registration = match unlocked_pdf_registration(registry, path, password) {
        Ok(registration) => registration,
        Err(error) => {
            registry.restore_pending_unlock(&pending_path);
            return Err(error);
        }
    };
    let source = registration.source.clone();
    registry.finish_unlock(&pending_path, registration);
    Ok(source)
}
