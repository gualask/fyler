import { useCallback } from 'react';

import { toDiagnosticMessage } from '../diagnostics';
import { useDiagnostics } from '../diagnostics/useDiagnostics';

export function useQuickAddLogger() {
    const { record } = useDiagnostics();

    const logSuccess = useCallback((action: 'enter' | 'exit') => {
        record({
            category: 'quick-add',
            severity: 'info',
            message: action === 'enter' ? 'Entered Quick Add mode' : 'Exited Quick Add mode',
        });
    }, [record]);

    const logFailure = useCallback((action: 'enter' | 'exit', error: unknown) => {
        record({
            category: 'quick-add',
            severity: 'error',
            message: `${action === 'enter' ? 'Failed to enter' : 'Failed to exit'} Quick Add: ${toDiagnosticMessage(error)}`,
        });
    }, [record]);

    return { logSuccess, logFailure };
}
