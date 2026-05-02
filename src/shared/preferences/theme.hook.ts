import { usePreferences } from './preferences.context';

export function useTheme() {
    const { isDark, toggleTheme, accent, setAccent } = usePreferences();
    return { isDark, toggleTheme, accent, setAccent };
}
