import { useEffect } from 'react';

import { useDiagnostics } from '@/diagnostics';
import { getErrorMessage } from '@/errors';

export function useGlobalErrorHandlers(onError: (message: string) => void) {
    const { record } = useDiagnostics();

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            event.preventDefault();
            const message = getErrorMessage(event.error ?? event.message);
            record({ category: 'app', severity: 'error', message: `Unhandled window error: ${message}` });
            onError(message);
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            event.preventDefault();
            const message = getErrorMessage(event.reason);
            record({ category: 'app', severity: 'error', message: `Unhandled promise rejection: ${message}` });
            onError(message);
        };

        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, [onError, record]);
}
