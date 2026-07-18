use std::env::consts::{ARCH, OS};
use std::fs;
use std::path::Path;
use std::sync::{Arc, Mutex, MutexGuard};
use tauri::Emitter;
use tauri::Manager;
use tauri::State;
use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::error::{AppError, UserFacingError};
use crate::export::export_pdf;
use crate::models::{MergeRequest, MergeResult, OpenFilesResult, SkippedFile, SourceFile};
use crate::pdf::{image_export_preview_layout, ImageExportPreviewLayout, IMAGE_EXTENSIONS};
use crate::source_registry::{
    files_from_paths, unlocked_pdf_source as build_unlocked_pdf_source, SourceRegistry,
};
use crate::vo::DocKind;

const SUPPORT_ISSUE_HOST: &str = "github.com";
const SUPPORT_ISSUE_PATH: &str = "/gualask/fyler/issues/new";

#[derive(Clone, Default)]
/// One-shot output paths granted by the native save dialog.
pub struct OutputPathAuthorizations {
    paths: Arc<Mutex<std::collections::HashSet<String>>>,
}

impl OutputPathAuthorizations {
    fn paths(&self) -> MutexGuard<'_, std::collections::HashSet<String>> {
        self.paths
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    fn authorize(&self, path: String) {
        self.paths().insert(path);
    }

    fn consume(&self, path: &str) -> bool {
        self.paths().remove(path)
    }
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
struct ImportWarningPayload {
    kind: &'static str,
    skipped_count: usize,
    preview: Vec<SkippedFile>,
    has_more: bool,
}

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
/// Minimal app metadata surfaced to the frontend for diagnostics/UI.
pub struct AppMetadataPayload {
    app_name: String,
    version: String,
    identifier: String,
    platform: String,
    arch: String,
}

fn emit_import_warning(app: &tauri::AppHandle, skipped: &[SkippedFile]) {
    if skipped.is_empty() {
        return;
    }

    let _ = app.emit(
        "app-status",
        ImportWarningPayload {
            kind: "import-warning",
            skipped_count: skipped.len(),
            preview: skipped.iter().take(2).cloned().collect(),
            has_more: skipped.len() > 2,
        },
    );
}

fn finalize_import(
    app: &tauri::AppHandle,
    result: crate::source_registry::FilesFromPathsResult,
    extra_skipped: Vec<SkippedFile>,
) -> OpenFilesResult {
    let mut skipped = extra_skipped;
    skipped.extend(result.skipped);
    emit_import_warning(app, &skipped);
    OpenFilesResult {
        files: result.files,
        password_required: result.password_required,
        skipped_errors: skipped,
    }
}

fn empty_open_files_result() -> OpenFilesResult {
    OpenFilesResult {
        files: vec![],
        password_required: vec![],
        skipped_errors: vec![],
    }
}

fn path_file_name(path: &Path) -> String {
    path.file_name()
        .unwrap_or_default()
        .to_string_lossy()
        .to_string()
}

fn source_not_found_error() -> anyhow::Error {
    anyhow::Error::new(UserFacingError::new("source_not_found"))
}

fn ensure_path_is_authorized(app: &tauri::AppHandle, path: &str) -> anyhow::Result<()> {
    if app.asset_protocol_scope().is_allowed(path) {
        Ok(())
    } else {
        Err(source_not_found_error())
    }
}

fn authorized_drop_paths(
    app: &tauri::AppHandle,
    paths: Vec<String>,
) -> (Vec<String>, Vec<SkippedFile>) {
    let scope = app.asset_protocol_scope();
    let mut authorized = Vec::with_capacity(paths.len());
    let mut skipped = Vec::new();

    for path in paths {
        if scope.is_allowed(&path) {
            authorized.push(path);
        } else {
            skipped.push(SkippedFile {
                name: path_file_name(Path::new(&path)),
                reason: "path_error".into(),
                detail: None,
            });
        }
    }

    (authorized, skipped)
}

fn validated_support_issue_url(raw_url: &str) -> anyhow::Result<url::Url> {
    let parsed =
        url::Url::parse(raw_url).map_err(|_| UserFacingError::new("external_url_not_allowed"))?;
    let is_allowed = parsed.scheme() == "https"
        && parsed.host_str() == Some(SUPPORT_ISSUE_HOST)
        && parsed.port().is_none()
        && parsed.username().is_empty()
        && parsed.password().is_none()
        && parsed.path() == SUPPORT_ISSUE_PATH
        && parsed.fragment().is_none();

    if is_allowed {
        Ok(parsed)
    } else {
        Err(anyhow::Error::new(UserFacingError::new(
            "external_url_not_allowed",
        )))
    }
}

#[tauri::command]
/// Opens a native file picker dialog and imports the selected files.
///
/// Import is performed on a blocking thread to avoid stalling the UI thread.
pub async fn open_files_dialog(
    app: tauri::AppHandle,
    filter_label: String,
    registry: State<'_, SourceRegistry>,
) -> Result<OpenFilesResult, AppError> {
    let mut filter_exts = vec!["pdf"];
    filter_exts.extend_from_slice(IMAGE_EXTENSIONS);

    let Some(files) = app
        .dialog()
        .file()
        .add_filter(&filter_label, &filter_exts)
        .blocking_pick_files()
    else {
        // User cancelled or dialog returned no selection
        return Ok(empty_open_files_result());
    };

    if files.is_empty() {
        return Ok(empty_open_files_result());
    }

    let scope = app.asset_protocol_scope();
    let mut path_skipped = Vec::new();
    let paths = files
        .into_iter()
        .filter_map(|file| match file.into_path() {
            Ok(path) => match scope.allow_file(&path) {
                Ok(()) => Some(path.to_string_lossy().to_string()),
                Err(error) => {
                    eprintln!("[warn] Failed to authorize selected file: {error}");
                    path_skipped.push(SkippedFile {
                        name: path_file_name(&path),
                        reason: "path_error".into(),
                        detail: None,
                    });
                    None
                }
            },
            Err(e) => {
                eprintln!("[warn] Failed to resolve file path: {e}");
                path_skipped.push(SkippedFile {
                    name: String::new(),
                    reason: "path_error".into(),
                    detail: Some(e.to_string()),
                });
                None
            }
        })
        .collect::<Vec<_>>();

    let registry = registry.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || files_from_paths(paths, &registry))
        .await
        .map_err(anyhow::Error::from)??;
    let import_result = finalize_import(&app, result, path_skipped);
    Ok(import_result)
}

#[tauri::command]
/// Imports files from the provided filesystem paths (used for drag&drop / CLI integrations).
pub async fn open_files_from_paths(
    app: tauri::AppHandle,
    paths: Vec<String>,
    registry: State<'_, SourceRegistry>,
) -> Result<OpenFilesResult, AppError> {
    let (paths, path_skipped) = authorized_drop_paths(&app, paths);
    let registry = registry.inner().clone();
    let result = tauri::async_runtime::spawn_blocking(move || files_from_paths(paths, &registry))
        .await
        .map_err(anyhow::Error::from)??;
    let import_result = finalize_import(&app, result, path_skipped);
    Ok(import_result)
}

#[tauri::command]
/// Unlocks and registers one password-protected PDF.
pub async fn unlock_pdf_source(
    app: tauri::AppHandle,
    path: String,
    password: String,
    registry: State<'_, SourceRegistry>,
) -> Result<SourceFile, AppError> {
    ensure_path_is_authorized(&app, &path)?;
    let registry = registry.inner().clone();
    if !registry.begin_unlock(&path) {
        return Err(source_not_found_error().into());
    }

    let pending_path = path.clone();
    let result =
        tauri::async_runtime::spawn_blocking(move || build_unlocked_pdf_source(path, password))
            .await;
    let entry = match result {
        Ok(Ok(entry)) => entry,
        Ok(Err(error)) => {
            registry.restore_pending_unlock(&pending_path);
            return Err(error.into());
        }
        Err(error) => {
            registry.restore_pending_unlock(&pending_path);
            return Err(anyhow::Error::from(error).into());
        }
    };
    let (source, registered) = entry.into_parts();
    registry.finish_unlock(&pending_path, source.id.clone(), registered);
    Ok(source)
}

#[tauri::command]
/// Releases password-protected imports that the user chose to skip.
pub fn discard_pending_sources(paths: Vec<String>, registry: State<'_, SourceRegistry>) {
    registry.discard_pending_paths(&paths);
}

#[tauri::command]
/// Releases all backend resources associated with the given file IDs.
///
/// The frontend calls this when a source is removed from the session.
pub fn release_sources(file_ids: Vec<String>, registry: State<'_, SourceRegistry>) {
    registry.remove_many(&file_ids);
}

#[tauri::command]
/// Returns the compressed display preview generated during image import.
pub fn get_image_preview(
    file_id: String,
    registry: State<'_, SourceRegistry>,
) -> tauri::ipc::Response {
    tauri::ipc::Response::new(registry.get_image_preview(&file_id).unwrap_or_default())
}

#[tauri::command]
/// Opens a native save dialog and returns the chosen path (or empty string if cancelled).
pub async fn save_pdf_dialog(
    app: tauri::AppHandle,
    default_filename: String,
    filter_label: String,
    output_paths: State<'_, OutputPathAuthorizations>,
) -> Result<String, AppError> {
    let path = app
        .dialog()
        .file()
        .add_filter(&filter_label, &["pdf"])
        .set_file_name(&default_filename)
        .blocking_save_file()
        .and_then(|file| file.into_path().ok())
        .map(|path| path.to_string_lossy().to_string())
        .unwrap_or_default();
    if !path.is_empty() {
        output_paths.authorize(path.clone());
    }
    Ok(path)
}

#[tauri::command]
/// Opens a native save dialog and writes the provided text file.
///
/// Returns the saved path (or empty string if cancelled).
pub async fn save_text_file(
    app: tauri::AppHandle,
    default_filename: String,
    filter_label: String,
    content: String,
) -> Result<String, AppError> {
    let Some(path) = app
        .dialog()
        .file()
        .add_filter(&filter_label, &["txt"])
        .set_file_name(&default_filename)
        .blocking_save_file()
        .and_then(|file| file.into_path().ok())
    else {
        return Ok(String::new());
    };

    fs::write(&path, content).map_err(anyhow::Error::from)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
/// Exports the requested composition to a single PDF.
///
/// Runs on a blocking thread; progress is emitted as `"merge-progress"` events.
pub async fn merge_pdfs(
    app: tauri::AppHandle,
    registry: State<'_, SourceRegistry>,
    output_paths: State<'_, OutputPathAuthorizations>,
    req: MergeRequest,
) -> Result<MergeResult, AppError> {
    if !output_paths.consume(&req.output_path) {
        return Err(anyhow::Error::new(UserFacingError::new("output_path_not_authorized")).into());
    }

    let app = app.clone();
    let registry = registry.inner().clone();
    tauri::async_runtime::spawn_blocking(move || export_pdf(&app, &registry, req))
        .await
        .map_err(anyhow::Error::from)?
        .map_err(Into::into)
}

#[tauri::command]
/// Returns build/runtime metadata for diagnostics and the "About" UI.
pub fn get_app_metadata(app: tauri::AppHandle) -> AppMetadataPayload {
    let package = app.package_info();
    AppMetadataPayload {
        app_name: package.name.clone(),
        version: package.version.to_string(),
        identifier: app.config().identifier.clone(),
        platform: OS.to_string(),
        arch: ARCH.to_string(),
    }
}

#[tauri::command]
/// Opens an external URL using the OS handler (default browser).
pub fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), AppError> {
    let url = validated_support_issue_url(&url)?;
    app.opener()
        .open_url(url.as_str(), None::<String>)
        .map_err(anyhow::Error::from)?;
    Ok(())
}

#[tauri::command]
/// Computes a preview layout for exporting a single image as a PDF page.
///
/// This is used by the frontend to show an accurate export preview without duplicating layout math.
pub async fn get_image_export_preview_layout(
    file_id: String,
    image_fit: String,
    quarter_turns: u8,
    registry: State<'_, SourceRegistry>,
) -> Result<ImageExportPreviewLayout, AppError> {
    let source = registry.get(&file_id).ok_or_else(source_not_found_error)?;
    if source.kind != DocKind::Image {
        return Err(anyhow::Error::new(UserFacingError::new("invalid_export_item_kind")).into());
    }

    let path = source.original_path;
    tauri::async_runtime::spawn_blocking(move || {
        image_export_preview_layout(&path, &image_fit, quarter_turns)
    })
    .await
    .map_err(anyhow::Error::from)?
    .map_err(Into::into)
}

#[cfg(test)]
mod tests {
    use super::{validated_support_issue_url, OutputPathAuthorizations};

    #[test]
    fn support_issue_url_accepts_only_the_expected_github_endpoint() {
        assert!(validated_support_issue_url(
            "https://github.com/gualask/fyler/issues/new?title=Bug&body=Details"
        )
        .is_ok());

        for url in [
            "http://github.com/gualask/fyler/issues/new",
            "https://github.com.evil.example/gualask/fyler/issues/new",
            "https://github.com/gualask/fyler/releases",
            "https://user@github.com/gualask/fyler/issues/new",
            "file:///tmp/report.txt",
        ] {
            assert!(validated_support_issue_url(url).is_err(), "accepted {url}");
        }
    }

    #[test]
    fn output_path_authorizations_are_single_use() {
        let authorizations = OutputPathAuthorizations::default();
        authorizations.authorize("/tmp/export.pdf".to_string());

        assert!(authorizations.consume("/tmp/export.pdf"));
        assert!(!authorizations.consume("/tmp/export.pdf"));
    }
}
