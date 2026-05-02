import type { ReactNode } from 'react';

import { preferencesStorage } from '@/infra/platform/preferences.storage';
import { DiagnosticsProvider } from '@/shared/diagnostics';
import { PreferencesProvider } from '@/shared/preferences';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <PreferencesProvider storage={preferencesStorage}>
            <DiagnosticsProvider>{children}</DiagnosticsProvider>
        </PreferencesProvider>
    );
}
