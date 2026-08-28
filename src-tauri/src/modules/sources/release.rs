use super::ports::{ImagePreviewBytes, SourceImport, SourceLifecycle, SourceLookup};

/// Releases pending password prompts that the user explicitly skipped.
pub fn discard_pending_sources<R: SourceLifecycle>(registry: &R, paths: &[String]) {
    registry.discard_pending_paths(paths);
}

/// Releases all backend resources associated with the given source IDs.
pub fn release_sources<R: SourceLifecycle>(registry: &R, file_ids: &[String]) {
    registry.remove_many(file_ids);
}

/// Reads the compressed image preview retained for one source ID.
pub fn image_preview<R: SourceLookup>(registry: &R, file_id: &str) -> ImagePreviewBytes {
    registry.get_image_preview(file_id).unwrap_or_default()
}

/// Generates a bounded display preview without retaining it in the source registry.
pub fn image_preview_for_path<R: SourceImport>(
    registry: &R,
    path: &str,
    max_long_side: u32,
) -> anyhow::Result<ImagePreviewBytes> {
    registry.make_image_preview_with_long_side(path, max_long_side)
}
