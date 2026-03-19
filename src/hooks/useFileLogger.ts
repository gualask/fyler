import { useCallback } from 'react';

import { toDiagnosticMessage } from '../diagnostics';
import { useDiagnostics } from '../diagnostics/useDiagnostics';

export function useFileLogger() {
    const { record } = useDiagnostics();

    const logStarted = useCallback(() => {
        record({ category: 'files', severity: 'info', message: 'Open files dialog started' });
    }, [record]);

    const logResult = useCallback((addedCount: number) => {
        record({
            category: 'files',
            severity: 'info',
            message: addedCount ? 'Files added to workspace' : 'Open files dialog canceled',
            metadata: { addedCount },
        });
    }, [record]);

    const logFailure = useCallback((error: unknown) => {
        record({
            category: 'files',
            severity: 'error',
            message: `Open files failed: ${toDiagnosticMessage(error)}`,
        });
    }, [record]);

    return { logStarted, logResult, logFailure };
}
