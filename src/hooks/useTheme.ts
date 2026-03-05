import { useEffect, useRef, useState } from 'react';
import { loadSettings, saveSettings } from '../settings';

/**
 * Manages the dark/light theme: loads the persisted preference on mount,
 * toggles the `dark` class on the document element, and auto-saves changes.
 * Skips saving on the initial render to avoid overwriting persisted state
 * before it has been loaded.
 */
export function useTheme() {
    const [isDark, setIsDark] = useState(false);
    const hasLoaded = useRef(false);

    useEffect(() => {
        void loadSettings().then((s) => {
            hasLoaded.current = true;
            setIsDark(s.isDark);
        });
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        if (hasLoaded.current) {
            void saveSettings({ isDark });
        }
    }, [isDark]);

    const toggleTheme = () => setIsDark((d) => !d);

    return { isDark, toggleTheme };
}
