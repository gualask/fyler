import { useContext } from 'react';

import { DiagnosticsContext } from './diagnostics.context';

export function useDiagnostics() {
    const context = useContext(DiagnosticsContext);
    if (!context) {
        throw new Error('DiagnosticsProvider not found');
    }

    return context;
}
