use anyhow::Context;
use tauri_plugin_store::StoreExt;

use crate::error::AppError;

#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> Result<bool, AppError> {
    let store = app.store("settings.json").context("impossibile aprire store")?;
    Ok(store.get("isDark").and_then(|v| v.as_bool()).unwrap_or(false))
}

#[tauri::command]
pub async fn save_settings(app: tauri::AppHandle, is_dark: bool) -> Result<(), AppError> {
    let store = app.store("settings.json").context("impossibile aprire store")?;
    store.set("isDark", is_dark);
    store.save().context("impossibile salvare store")?;
    Ok(())
}
