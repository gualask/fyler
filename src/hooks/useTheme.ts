import { useEffect, useState } from 'react';
import { loadSettings, saveSettings } from '../settings';

/**
 * Manages the dark/light theme: loads the persisted preference on mount,
 * toggles the `dark` class on the document element, and auto-saves changes.
 */
export function useTheme() {
    const [isDark, setIsDark] = useState(false);

    useEffect(() => {
        void loadSettings().then((s) => setIsDark(s.isDark));
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        void saveSettings({ isDark });
    }, [isDark]);

    const toggleTheme = () => setIsDark((d) => !d);

    return { isDark, toggleTheme };
}
