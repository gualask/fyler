import { invoke } from '@tauri-apps/api/core';

import type { Locale } from './locale';

export type AccentColor = 'indigo' | 'teal' | 'amber' | 'blue';

export const ACCENT_COLORS: AccentColor[] = ['indigo', 'teal', 'amber', 'blue'];

export interface AppSettings {
    isDark: boolean;
    locale?: Locale;
    accent?: AccentColor;
    tutorialSeen?: boolean;
}

export async function loadSettings(): Promise<AppSettings> {
    return invoke<AppSettings>('load_settings');
}

export async function saveSettings(settings: AppSettings): Promise<void> {
    await invoke('save_settings', { settings });
}
