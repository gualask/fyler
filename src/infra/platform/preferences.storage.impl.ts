import type { PreferencesSettings } from '../../shared/preferences/preferences.settings';
import type { PreferencesStorage } from '../../shared/preferences/preferences.storage';

const FALLBACK_SETTINGS: PreferencesSettings = {
    isDark: false,
};

export function createMirroredPreferencesStorage({
    readSnapshot,
    writeSnapshot,
    hasNativeRuntime,
    loadNative,
    saveNative,
}: {
    readSnapshot: () => PreferencesSettings | null;
    writeSnapshot: (settings: PreferencesSettings) => void;
    hasNativeRuntime: () => boolean;
    loadNative: () => Promise<PreferencesSettings>;
    saveNative: (settings: PreferencesSettings) => Promise<void>;
}): PreferencesStorage {
    return {
        readSnapshot,
        async load() {
            const snapshot = readSnapshot();

            if (!hasNativeRuntime()) {
                return snapshot ?? FALLBACK_SETTINGS;
            }

            try {
                const settings = await loadNative();
                writeSnapshot(settings);
                return settings;
            } catch {
                return snapshot ?? FALLBACK_SETTINGS;
            }
        },
        async save(settings) {
            writeSnapshot(settings);

            if (!hasNativeRuntime()) {
                return;
            }

            await saveNative(settings);
        },
    };
}
