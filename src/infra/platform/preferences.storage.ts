import { invoke } from '@tauri-apps/api/core';
import type { PreferencesSettings } from '@/shared/preferences/preferences.settings';
import type { PreferencesStorage } from '@/shared/preferences/preferences.storage';

export const preferencesStorage: PreferencesStorage = {
    load: () => invoke<PreferencesSettings>('load_settings'),
    save: (settings) => invoke('save_settings', { settings }),
};
