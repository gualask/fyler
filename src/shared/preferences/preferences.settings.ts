import { invoke } from '@tauri-apps/api/core';

import type { Locale } from './preferences.locale';

export type AccentColor = 'indigo' | 'teal' | 'amber' | 'blue';

export const ACCENT_COLORS: AccentColor[] = ['indigo', 'teal', 'amber', 'blue'];

export interface PreferencesSettings {
    isDark: boolean;
    locale?: Locale;
    accent?: AccentColor;
    tutorialSeen?: boolean;
}

export async function loadSettings(): Promise<PreferencesSettings> {
    return invoke<PreferencesSettings>('load_settings');
}

export async function saveSettings(settings: PreferencesSettings): Promise<void> {
    await invoke('save_settings', { settings });
}
