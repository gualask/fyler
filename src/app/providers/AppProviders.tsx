import { QueryClientProvider } from '@tanstack/react-query';
import { type ReactNode, useState } from 'react';

import { preferencesStorage } from '@/infra/platform/preferences.storage';
import { DiagnosticsProvider } from '@/shared/diagnostics';
import { PreferencesProvider } from '@/shared/preferences';
import { createAppQueryClient } from './query-client';

export function AppProviders({ children }: { children: ReactNode }) {
    const [queryClient] = useState(createAppQueryClient);

    return (
        <QueryClientProvider client={queryClient}>
            <PreferencesProvider storage={preferencesStorage}>
                <DiagnosticsProvider>{children}</DiagnosticsProvider>
            </PreferencesProvider>
        </QueryClientProvider>
    );
}
