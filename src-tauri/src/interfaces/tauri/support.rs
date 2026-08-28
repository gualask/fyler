//! Tauri adapters for support and diagnostics commands.

use std::env::consts::{ARCH, OS};

use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::infrastructure::filesystem::TextFileOutput;
use crate::modules::support::{self, AppMetadataPayload};
use crate::shared::error::AppError;

#[tauri::command]
/// Opens a native save dialog and writes the provided text file.
///
/// Returns the saved path (or empty string if cancelled).
pub(crate) async fn save_text_file(
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

    let writer = TextFileOutput;
    support::save_text_file(&writer, &path, &content)?;
    Ok(path.to_string_lossy().to_string())
}

#[tauri::command]
/// Returns build/runtime metadata for diagnostics and the "About" UI.
pub(crate) fn get_app_metadata(app: tauri::AppHandle) -> AppMetadataPayload {
    let package = app.package_info();
    support::app_metadata(
        package.name.clone(),
        package.version.to_string(),
        app.config().identifier.clone(),
        OS.to_string(),
        ARCH.to_string(),
    )
}

#[tauri::command]
/// Opens an external URL using the OS handler (default browser).
pub(crate) fn open_external_url(app: tauri::AppHandle, url: String) -> Result<(), AppError> {
    let url = support::validated_support_issue_url(&url)?;
    app.opener()
        .open_url(url.as_str(), None::<String>)
        .map_err(anyhow::Error::from)?;
    Ok(())
}
