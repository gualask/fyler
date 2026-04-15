import type { PreferencesSettings } from './preferences.settings';

export type PreferencesStorage = {
    readSnapshot: () => PreferencesSettings | null;
    load: () => Promise<PreferencesSettings>;
    save: (settings: PreferencesSettings) => Promise<void>;
};
