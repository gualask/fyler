import type { ReactNode } from 'react';

import { DiagnosticsProvider } from '@/shared/diagnostics';
import { PreferencesProvider } from '@/shared/preferences';

export function AppProviders({ children }: { children: ReactNode }) {
    return (
        <PreferencesProvider>
            <DiagnosticsProvider>{children}</DiagnosticsProvider>
        </PreferencesProvider>
    );
}
