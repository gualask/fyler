use std::env::consts::{ARCH, OS};
use std::fs;

use tauri_plugin_dialog::DialogExt;
use tauri_plugin_opener::OpenerExt;

use crate::error::{AppError, UserFacingError, UserFacingErrorCode};

const SUPPORT_ISSUE_HOST: &str = "github.com";
const SUPPORT_ISSUE_PATH: &str = "/gualask/fyler/issues/new";

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

fn validated_support_issue_url(raw_url: &str) -> anyhow::Result<url::Url> {
    let parsed = url::Url::parse(raw_url)
        .map_err(|_| UserFacingError::new(UserFacingErrorCode::ExternalUrlNotAllowed))?;
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
            UserFacingErrorCode::ExternalUrlNotAllowed,
        )))
    }
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

#[cfg(test)]
mod tests {
    use super::validated_support_issue_url;

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
}
