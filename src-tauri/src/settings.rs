use anyhow::Context;
use tauri_plugin_store::StoreExt;

use crate::error::AppError;

#[derive(serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct StoredSettings {
    is_dark: bool,
    locale: Option<String>,
}

fn sanitize_locale(locale: Option<String>) -> Option<String> {
    match locale.as_deref() {
        Some("it" | "en") => locale,
        _ => None,
    }
}

#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> Result<StoredSettings, AppError> {
    let store = app.store("settings.json").context("impossibile aprire store")?;
    Ok(StoredSettings {
        is_dark: store.get("isDark").and_then(|v| v.as_bool()).unwrap_or(false),
        locale: sanitize_locale(
            store
                .get("locale")
                .and_then(|v| v.as_str().map(|locale| locale.to_owned())),
        ),
    })
}

#[tauri::command]
pub async fn save_settings(app: tauri::AppHandle, settings: StoredSettings) -> Result<(), AppError> {
    let store = app.store("settings.json").context("impossibile aprire store")?;
    store.set("isDark", settings.is_dark);
    if let Some(locale) = sanitize_locale(settings.locale) {
        store.set("locale", locale);
    }
    store.save().context("impossibile salvare store")?;
    Ok(())
}
