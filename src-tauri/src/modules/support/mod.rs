//! Support and diagnostics use cases.
//!
//! This module owns support policy and payloads.  The runtime adapter is responsible only for
//! choosing native dialogs/openers and delegates validation and file persistence here.

use std::path::Path;

use crate::shared::error::{UserFacingError, UserFacingErrorCode};

/// Runtime port for writing support text selected through the native dialog.
pub(crate) trait TextFileWriter: Send + Sync {
    fn write(&self, path: &Path, content: &str) -> anyhow::Result<()>;
}

const SUPPORT_ISSUE_HOST: &str = "github.com";
const SUPPORT_ISSUE_PATH: &str = "/gualask/fyler/issues/new";

#[derive(Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
/// Minimal app metadata surfaced to the frontend for diagnostics/UI.
pub(crate) struct AppMetadataPayload {
    pub(crate) app_name: String,
    pub(crate) version: String,
    pub(crate) identifier: String,
    pub(crate) platform: String,
    pub(crate) arch: String,
}

/// Builds the stable diagnostics payload from values supplied by the runtime.
pub(crate) fn app_metadata(
    app_name: String,
    version: String,
    identifier: String,
    platform: String,
    arch: String,
) -> AppMetadataPayload {
    AppMetadataPayload {
        app_name,
        version,
        identifier,
        platform,
        arch,
    }
}

/// Validates that a support URL points exactly to Fyler's issue endpoint.
pub(crate) fn validated_support_issue_url(raw_url: &str) -> anyhow::Result<url::Url> {
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

/// Saves support text through the focused runtime writer.
pub(crate) fn save_text_file<W: TextFileWriter + ?Sized>(
    writer: &W,
    path: &Path,
    content: &str,
) -> anyhow::Result<()> {
    writer.write(path, content)
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
