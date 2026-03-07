import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../settings';

/**
 * Manages the dark/light theme: loads the persisted preference on mount,
 * toggles the `dark` class on the document element, and auto-saves changes.
 * Skips saving on the initial render to avoid overwriting persisted state
 * before it has been loaded.
 */
export function useTheme() {
    const [isDark, setIsDark] = useState(false);
    const [loaded, setLoaded] = useState(false);

    useEffect(() => {
        void loadSettings().then((s) => {
            setLoaded(true);
            setIsDark(s.isDark);
        });
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        if (!loaded) return;
        void saveSettings({ isDark });
    }, [isDark, loaded]);

    const toggleTheme = () => setIsDark((d) => !d);

    return { isDark, toggleTheme };
}
