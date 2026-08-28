//! Tauri adapters for persisted settings.

use crate::infrastructure::settings_store::TauriSettingsStore;
use crate::modules::settings::{self, StoredSettings};
use crate::shared::error::AppError;

#[tauri::command]
/// Loads persisted settings through the settings module.
pub(crate) async fn load_settings(app: tauri::AppHandle) -> Result<StoredSettings, AppError> {
    let persistence = TauriSettingsStore::new(app);
    settings::load_settings(&persistence)
}

#[tauri::command]
/// Saves persisted settings through the settings module.
pub(crate) async fn save_settings(
    app: tauri::AppHandle,
    settings: StoredSettings,
) -> Result<(), AppError> {
    let persistence = TauriSettingsStore::new(app);
    settings::save_settings(&persistence, settings)
}
