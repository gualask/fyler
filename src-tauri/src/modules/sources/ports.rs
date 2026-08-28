use super::contracts::{DocKind, SourceFile};

/// Backend-only representation of an imported source.
#[derive(Clone)]
pub struct RegisteredSource {
    /// Original filesystem path for this source.
    pub original_path: String,
    /// `"pdf"` or `"image"`.
    pub kind: DocKind,
    /// Password for encrypted PDFs, kept only in process memory.
    pub password: Option<String>,
}

/// Compressed JPEG display preview bytes retained for an imported image.
pub type ImagePreviewBytes = Vec<u8>;

/// A source registration committed atomically with its path reservation.
#[derive(Clone)]
pub struct SourceRegistration {
    pub source: SourceFile,
    pub registered: RegisteredSource,
}

/// Source-import integration port for filesystem metadata and generated previews.
///
/// The source use case owns the import policy while the infrastructure adapter owns filesystem
/// access and image decoding. Keeping this port separate from lifecycle writes prevents callers
/// from reaching into the registry's storage representation.
pub trait SourceImport: Send + Sync {
    fn detect_kind_from_ext(&self, path: &str) -> Option<DocKind>;
    fn source_file_name(&self, path: &str) -> String;
    fn source_byte_size(&self, path: &str) -> u64;
    fn make_image_preview(&self, path: &str) -> anyhow::Result<ImagePreviewBytes>;
    fn make_image_preview_with_long_side(
        &self,
        path: &str,
        max_long_side: u32,
    ) -> anyhow::Result<ImagePreviewBytes>;
}

/// Consumer-facing source lookup port.
///
/// Merge and later workflows resolve source IDs through this port instead of depending on the
/// in-memory registry implementation. Preview bytes are part of the source lookup boundary
/// because they are indexed by the same workflow-owned source ID.
pub trait SourceLookup: Send + Sync {
    fn get(&self, file_id: &str) -> Option<RegisteredSource>;
    fn get_image_preview(&self, file_id: &str) -> Option<ImagePreviewBytes>;
}

/// Source-owned lifecycle port used by import, unlock, and release use cases.
///
/// Implementations must keep reservations, registrations, previews, pending-password paths, and
/// removals under one synchronization boundary so a source is never half-visible to consumers.
pub trait SourceLifecycle: SourceLookup {
    fn reserve_import_paths(&self, paths: impl IntoIterator<Item = String>) -> Vec<String>;
    fn cancel_import_paths(&self, paths: &[String]);
    fn finish_import_batch(
        &self,
        reserved_paths: &[String],
        entries: Vec<SourceRegistration>,
        previews: Vec<(String, ImagePreviewBytes)>,
        password_required_paths: &[String],
    );
    fn begin_unlock(&self, path: &str) -> bool;
    fn restore_pending_unlock(&self, path: &str);
    fn finish_unlock(&self, path: &str, registration: SourceRegistration);
    fn discard_pending_paths(&self, paths: &[String]);
    fn remove_many(&self, file_ids: &[String]);
}
