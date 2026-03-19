import { useCallback } from 'react';

import { toDiagnosticMessage } from '../diagnostics';
import { useDiagnostics } from '../diagnostics/useDiagnostics';

export function useExportLogger(optimizationPreset: string, imageFit: string) {
    const { record } = useDiagnostics();

    const logStarted = useCallback((pageCount: number) => {
        record({
            category: 'export',
            severity: 'info',
            message: 'PDF export started',
            metadata: {
                pageCount,
                optimizationPreset,
                imageFit,
            },
        });
    }, [imageFit, optimizationPreset, record]);

    const logCompleted = useCallback((pageCount: number) => {
        record({
            category: 'export',
            severity: 'info',
            message: 'PDF export completed successfully',
            metadata: { pageCount },
        });
    }, [record]);

    const logWarning = useCallback((optimizationFailedCount: number) => {
        record({
            category: 'export',
            severity: 'warn',
            message: 'PDF export completed with optimization warnings',
            metadata: { optimizationFailedCount },
        });
    }, [record]);

    const logFailure = useCallback((error: unknown) => {
        record({
            category: 'export',
            severity: 'error',
            message: `PDF export failed: ${toDiagnosticMessage(error)}`,
        });
    }, [record]);

    return { logStarted, logCompleted, logWarning, logFailure };
}
