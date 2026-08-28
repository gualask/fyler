//! Persisted application settings.
//!
//! The module owns the settings payload and supported-value policy. Persistence is a focused
//! port so runtime stores stay outside the module.

use crate::shared::error::AppError;

pub(crate) const SETTINGS_STORE_FILE: &str = "settings.json";
pub(crate) const KEY_IS_DARK: &str = "isDark";
pub(crate) const KEY_LOCALE: &str = "locale";
pub(crate) const KEY_ACCENT: &str = "accent";
pub(crate) const KEY_TUTORIAL_SEEN: &str = "tutorialSeen";
pub(crate) const KEY_FINAL_DOCUMENT_LAYOUT: &str = "finalDocumentLayout";

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
/// Persisted user preferences stored by the runtime adapter.
pub(crate) struct StoredSettings {
    pub(crate) is_dark: bool,
    pub(crate) locale: Option<String>,
    pub(crate) accent: Option<String>,
    pub(crate) tutorial_seen: Option<bool>,
    pub(crate) final_document_layout: Option<String>,
}

/// Runtime persistence port for settings owned by this module.
pub(crate) trait SettingsPersistence: Send + Sync {
    fn load(&self) -> anyhow::Result<StoredSettings>;
    fn save(&self, settings: &StoredSettings) -> anyhow::Result<()>;
}

fn sanitize_locale(locale: Option<String>) -> Option<String> {
    match locale.as_deref() {
        Some("it" | "en") => locale,
        _ => None,
    }
}

fn sanitize_accent(accent: Option<String>) -> Option<String> {
    match accent.as_deref() {
        Some("indigo" | "teal" | "amber" | "blue") => accent,
        _ => None,
    }
}

fn sanitize_final_document_layout(layout: Option<String>) -> Option<String> {
    match layout.as_deref() {
        Some("columns-2" | "columns-1") => layout,
        _ => None,
    }
}

fn sanitize_settings(settings: StoredSettings) -> StoredSettings {
    StoredSettings {
        is_dark: settings.is_dark,
        locale: sanitize_locale(settings.locale),
        accent: sanitize_accent(settings.accent),
        tutorial_seen: settings.tutorial_seen,
        final_document_layout: sanitize_final_document_layout(settings.final_document_layout),
    }
}

/// Loads persisted settings and applies the module's supported-value policy.
pub(crate) fn load_settings<P: SettingsPersistence + ?Sized>(
    persistence: &P,
) -> Result<StoredSettings, AppError> {
    Ok(sanitize_settings(persistence.load()?))
}

/// Sanitizes and saves settings through the focused persistence port.
pub(crate) fn save_settings<P: SettingsPersistence + ?Sized>(
    persistence: &P,
    settings: StoredSettings,
) -> Result<(), AppError> {
    persistence.save(&sanitize_settings(settings))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use std::sync::Mutex;

    use super::{
        load_settings, sanitize_accent, sanitize_final_document_layout, sanitize_locale,
        save_settings, SettingsPersistence, StoredSettings,
    };

    #[derive(Default)]
    struct MemoryPersistence {
        settings: Mutex<Option<StoredSettings>>,
    }

    impl SettingsPersistence for MemoryPersistence {
        fn load(&self) -> anyhow::Result<StoredSettings> {
            Ok(self
                .settings
                .lock()
                .unwrap()
                .take()
                .unwrap_or(StoredSettings {
                    is_dark: false,
                    locale: None,
                    accent: None,
                    tutorial_seen: None,
                    final_document_layout: None,
                }))
        }

        fn save(&self, settings: &StoredSettings) -> anyhow::Result<()> {
            *self.settings.lock().unwrap() = Some(StoredSettings {
                is_dark: settings.is_dark,
                locale: settings.locale.clone(),
                accent: settings.accent.clone(),
                tutorial_seen: settings.tutorial_seen,
                final_document_layout: settings.final_document_layout.clone(),
            });
            Ok(())
        }
    }

    #[test]
    fn sanitizers_keep_only_supported_values() {
        assert_eq!(sanitize_locale(Some("it".into())), Some("it".into()));
        assert_eq!(sanitize_locale(Some("fr".into())), None);
        assert_eq!(sanitize_accent(Some("teal".into())), Some("teal".into()));
        assert_eq!(sanitize_accent(Some("purple".into())), None);
        assert_eq!(
            sanitize_final_document_layout(Some("columns-2".into())),
            Some("columns-2".into())
        );
        assert_eq!(sanitize_final_document_layout(Some("grid".into())), None);
    }

    #[test]
    fn settings_keep_the_camel_case_wire_payload() {
        let payload = serde_json::to_value(StoredSettings {
            is_dark: true,
            locale: Some("en".into()),
            accent: Some("indigo".into()),
            tutorial_seen: Some(true),
            final_document_layout: Some("columns-2".into()),
        })
        .expect("settings should serialize");

        assert_eq!(payload["isDark"], true);
        assert_eq!(payload["tutorialSeen"], true);
        assert_eq!(payload["finalDocumentLayout"], "columns-2");
    }

    #[test]
    fn use_cases_apply_sanitization_at_the_port_boundary() {
        let persistence = MemoryPersistence::default();
        save_settings(
            &persistence,
            StoredSettings {
                is_dark: true,
                locale: Some("fr".into()),
                accent: Some("purple".into()),
                tutorial_seen: None,
                final_document_layout: Some("grid".into()),
            },
        )
        .expect("save should succeed");

        let settings = load_settings(&persistence).expect("load should succeed");
        assert!(settings.is_dark);
        assert_eq!(settings.locale, None);
        assert_eq!(settings.accent, None);
        assert_eq!(settings.final_document_layout, None);
    }
}
