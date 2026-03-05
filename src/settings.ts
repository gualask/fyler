import { invoke } from '@tauri-apps/api/core';

interface AppSettings {
    isDark: boolean;
}

export async function loadSettings(): Promise<AppSettings> {
    const isDark = await invoke<boolean>('load_settings');
    return { isDark };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
    if (patch.isDark !== undefined) {
        await invoke('save_settings', { isDark: patch.isDark });
    }
}
