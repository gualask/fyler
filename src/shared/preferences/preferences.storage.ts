import type { PreferencesSettings } from './preferences.settings';

export type PreferencesStorage = {
    load: () => Promise<PreferencesSettings>;
    save: (settings: PreferencesSettings) => Promise<void>;
};
