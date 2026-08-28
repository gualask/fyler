mod contracts;
mod import;
mod import_candidates;
mod ports;
mod release;
mod unlock;

pub(crate) use contracts::{DocKind, OpenFilesResult, SkippedFile, SkippedFileReason, SourceFile};
#[cfg(test)]
pub(crate) use import::files_from_paths;
pub(crate) use import::{files_from_paths_with_progress, FilesFromPathsResult, ImportProgress};
pub(crate) use ports::{
    ImagePreviewBytes, RegisteredSource, SourceImport, SourceLifecycle, SourceLookup,
    SourceRegistration,
};
pub(crate) use release::{
    discard_pending_sources, image_preview, image_preview_for_path, release_sources,
};
pub(crate) use unlock::unlock_pdf_source;

#[cfg(test)]
mod tests;
