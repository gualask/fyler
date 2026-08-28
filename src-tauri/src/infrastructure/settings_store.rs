use anyhow::Context;
use tauri_plugin_store::StoreExt;

use crate::modules::settings::{
    SettingsPersistence, StoredSettings, KEY_ACCENT, KEY_FINAL_DOCUMENT_LAYOUT, KEY_IS_DARK,
    KEY_LOCALE, KEY_TUTORIAL_SEEN, SETTINGS_STORE_FILE,
};

/// Tauri plugin-store implementation of the settings persistence port.
pub(crate) struct TauriSettingsStore {
    app: tauri::AppHandle,
}

impl TauriSettingsStore {
    pub(crate) fn new(app: tauri::AppHandle) -> Self {
        Self { app }
    }
}

impl SettingsPersistence for TauriSettingsStore {
    fn load(&self) -> anyhow::Result<StoredSettings> {
        let store = self
            .app
            .store(SETTINGS_STORE_FILE)
            .context("failed to open settings store")?;
        Ok(StoredSettings {
            is_dark: store
                .get(KEY_IS_DARK)
                .and_then(|v| v.as_bool())
                .unwrap_or(false),
            locale: store
                .get(KEY_LOCALE)
                .and_then(|v| v.as_str().map(str::to_owned)),
            accent: store
                .get(KEY_ACCENT)
                .and_then(|v| v.as_str().map(str::to_owned)),
            tutorial_seen: store.get(KEY_TUTORIAL_SEEN).and_then(|v| v.as_bool()),
            final_document_layout: store
                .get(KEY_FINAL_DOCUMENT_LAYOUT)
                .and_then(|v| v.as_str().map(str::to_owned)),
        })
    }

    fn save(&self, settings: &StoredSettings) -> anyhow::Result<()> {
        let store = self
            .app
            .store(SETTINGS_STORE_FILE)
            .context("failed to open settings store")?;
        store.set(KEY_IS_DARK, settings.is_dark);

        if let Some(locale) = &settings.locale {
            store.set(KEY_LOCALE, locale.as_str());
        } else {
            store.delete(KEY_LOCALE);
        }

        if let Some(accent) = &settings.accent {
            store.set(KEY_ACCENT, accent.as_str());
        } else {
            store.delete(KEY_ACCENT);
        }

        if let Some(seen) = settings.tutorial_seen {
            store.set(KEY_TUTORIAL_SEEN, seen);
        } else {
            store.delete(KEY_TUTORIAL_SEEN);
        }

        if let Some(layout) = &settings.final_document_layout {
            store.set(KEY_FINAL_DOCUMENT_LAYOUT, layout.as_str());
        } else {
            store.delete(KEY_FINAL_DOCUMENT_LAYOUT);
        }

        store.save().context("failed to save settings store")?;
        Ok(())
    }
}
