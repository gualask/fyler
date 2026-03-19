import { useEffect } from 'react';

import { useDiagnostics } from '@/diagnostics/useDiagnostics';

function toErrorMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
}

export function useGlobalErrorHandlers(onError: (message: string) => void) {
    const { record } = useDiagnostics();

    useEffect(() => {
        const handleError = (event: ErrorEvent) => {
            event.preventDefault();
            const message = toErrorMessage(event.error ?? event.message);
            record({ category: 'app', severity: 'error', message: `Unhandled window error: ${message}` });
            onError(message);
        };
        const handleRejection = (event: PromiseRejectionEvent) => {
            event.preventDefault();
            const message = toErrorMessage(event.reason);
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
