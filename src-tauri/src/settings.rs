use anyhow::Context;
use tauri_plugin_store::StoreExt;

use crate::error::AppError;

const SETTINGS_STORE_FILE: &str = "settings.json";
const KEY_IS_DARK: &str = "isDark";
const KEY_LOCALE: &str = "locale";
const KEY_ACCENT: &str = "accent";
const KEY_TUTORIAL_SEEN: &str = "tutorialSeen";

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
/// Persisted user preferences stored via `tauri-plugin-store`.
pub struct StoredSettings {
    is_dark: bool,
    locale: Option<String>,
    accent: Option<String>,
    tutorial_seen: Option<bool>,
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

#[tauri::command]
/// Loads persisted settings, applying input sanitization to keep values within the supported set.
pub async fn load_settings(app: tauri::AppHandle) -> Result<StoredSettings, AppError> {
    let store = app
        .store(SETTINGS_STORE_FILE)
        .context("failed to open settings store")?;
    Ok(StoredSettings {
        is_dark: store
            .get(KEY_IS_DARK)
            .and_then(|v| v.as_bool())
            .unwrap_or(false),
        locale: sanitize_locale(
            store
                .get(KEY_LOCALE)
                .and_then(|v| v.as_str().map(|locale| locale.to_owned())),
        ),
        accent: sanitize_accent(
            store
                .get(KEY_ACCENT)
                .and_then(|v| v.as_str().map(|a| a.to_owned())),
        ),
        tutorial_seen: store.get(KEY_TUTORIAL_SEEN).and_then(|v| v.as_bool()),
    })
}

#[tauri::command]
/// Saves settings, sanitizing values and deleting keys for `None` to keep storage compact.
pub async fn save_settings(
    app: tauri::AppHandle,
    settings: StoredSettings,
) -> Result<(), AppError> {
    let store = app
        .store(SETTINGS_STORE_FILE)
        .context("failed to open settings store")?;
    store.set(KEY_IS_DARK, settings.is_dark);

    if let Some(locale) = sanitize_locale(settings.locale) {
        store.set(KEY_LOCALE, locale);
    } else {
        store.delete(KEY_LOCALE);
    }

    if let Some(accent) = sanitize_accent(settings.accent) {
        store.set(KEY_ACCENT, accent);
    } else {
        store.delete(KEY_ACCENT);
    }

    if let Some(seen) = settings.tutorial_seen {
        store.set(KEY_TUTORIAL_SEEN, seen);
    } else {
        store.delete(KEY_TUTORIAL_SEEN);
    }
    store.save().context("failed to save settings store")?;
    Ok(())
}
