import { useEffect, useRef, useState } from 'react';
import { loadSettings, saveSettings } from '../settings';

/**
 * Manages the dark/light theme: loads the persisted preference on mount,
 * toggles the `dark` class on the document element, and auto-saves changes.
 * Skips saving on the initial render to avoid overwriting persisted state
 * before it has been loaded.
 */
export function useTheme(onLog?: (msg: string) => void) {
    const [isDark, setIsDark] = useState(false);
    const hasLoaded = useRef(false);

    useEffect(() => {
        onLog?.('theme: loading settings…');
        loadSettings()
            .then((s) => {
                hasLoaded.current = true;
                onLog?.(`theme: loaded isDark=${String(s.isDark)}`);
                setIsDark(s.isDark);
            })
            .catch((e: unknown) => {
                onLog?.(`theme: load error — ${e instanceof Error ? e.message : String(e)}`);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        document.documentElement.classList.toggle('dark', isDark);
        if (!hasLoaded.current) return;
        onLog?.(`theme: saving isDark=${String(isDark)}…`);
        saveSettings({ isDark })
            .then(() => onLog?.(`theme: saved isDark=${String(isDark)}`))
            .catch((e: unknown) => {
                onLog?.(`theme: save error — ${e instanceof Error ? e.message : String(e)}`);
            });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isDark]);

    const toggleTheme = () => setIsDark((d) => !d);

    return { isDark, toggleTheme };
}
