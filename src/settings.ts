import { load, type Store } from '@tauri-apps/plugin-store';

interface AppSettings {
    isDark: boolean;
}

const DEFAULTS: AppSettings = { isDark: false };

let storePromise: Promise<Store> | null = null;

function getStore() {
    if (!storePromise) {
        storePromise = load('settings.json', { defaults: { isDark: false } });
    }
    return storePromise;
}

export async function loadSettings(): Promise<AppSettings> {
    const store = await getStore();
    const isDark = await store.get<boolean>('isDark');
    return { isDark: isDark ?? DEFAULTS.isDark };
}

export async function saveSettings(patch: Partial<AppSettings>): Promise<void> {
    const store = await getStore();
    for (const [key, value] of Object.entries(patch)) {
        await store.set(key, value);
    }
}
