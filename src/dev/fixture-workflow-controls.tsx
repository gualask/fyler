import { useState } from 'react';

import { AlwaysOnTopButton } from '@/app/shell/always-on-top';
import { AppSettingsMenu } from '@/app/shell/settings-menu/AppSettingsMenu';
import { useTheme } from '@/shared/preferences';
import { DEV_FIXTURE_INDEX_KEY, getDevFixtureHref } from './dev-mode';

export function useFixtureWorkflowControls() {
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const [alwaysOnTop, setAlwaysOnTop] = useState(false);
    const [lastAction, setLastAction] = useState('');

    return {
        lastAction,
        recordAction: setLastAction,
        backToIndex: () => window.location.assign(getDevFixtureHref(DEV_FIXTURE_INDEX_KEY)),
        renderSettingsMenu: () => (
            <AppSettingsMenu
                isDark={isDark}
                accent={accent}
                onToggleTheme={toggleTheme}
                onSetAccent={setAccent}
                onReportBug={() => setLastAction('report-bug-requested')}
            />
        ),
        renderAlwaysOnTopControl: () => (
            <AlwaysOnTopButton
                active={alwaysOnTop}
                disabled={false}
                onToggle={() => {
                    setAlwaysOnTop((current) => !current);
                    setLastAction(alwaysOnTop ? 'always-on-top-disabled' : 'always-on-top-enabled');
                }}
            />
        ),
    };
}
