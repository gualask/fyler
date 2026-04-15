import { invoke } from '@tauri-apps/api/core';
import type { PreferencesSettings } from '@/shared/preferences/preferences.settings';
import type { PreferencesStorage } from '@/shared/preferences/preferences.storage';
import { createMirroredPreferencesStorage } from './preferences.storage.impl';

const SNAPSHOT_STORAGE_KEY = 'fyler.preferences';

function hasNativePreferencesRuntime(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof (
            window as {
                __TAURI_INTERNALS__?: {
                    invoke?: unknown;
                };
            }
        ).__TAURI_INTERNALS__?.invoke === 'function'
    );
}

function readSnapshot(): PreferencesSettings | null {
    try {
        const raw = window.localStorage.getItem(SNAPSHOT_STORAGE_KEY);
        if (!raw) return null;

        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') {
            return null;
        }

        const settings = parsed as Partial<PreferencesSettings>;

        return {
            isDark: settings.isDark ?? false,
            locale: settings.locale,
            accent: settings.accent,
            tutorialSeen: settings.tutorialSeen,
        };
    } catch {
        return null;
    }
}

function writeSnapshot(settings: PreferencesSettings): void {
    try {
        window.localStorage.setItem(SNAPSHOT_STORAGE_KEY, JSON.stringify(settings));
    } catch {
        // Local snapshot persistence is best-effort.
    }
}

export const preferencesStorage: PreferencesStorage = createMirroredPreferencesStorage({
    readSnapshot,
    writeSnapshot,
    hasNativeRuntime: hasNativePreferencesRuntime,
    loadNative: () => invoke<PreferencesSettings>('load_settings'),
    saveNative: (settings) => invoke('save_settings', { settings }),
});
