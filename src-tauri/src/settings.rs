use tauri_plugin_store::StoreExt;

#[tauri::command]
pub async fn load_settings(app: tauri::AppHandle) -> Result<bool, String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    Ok(store.get("isDark").and_then(|v| v.as_bool()).unwrap_or(false))
}

#[tauri::command]
pub async fn save_settings(app: tauri::AppHandle, is_dark: bool) -> Result<(), String> {
    let store = app.store("settings.json").map_err(|e| e.to_string())?;
    store.set("isDark", is_dark);
    store.save().map_err(|e| e.to_string())
}
