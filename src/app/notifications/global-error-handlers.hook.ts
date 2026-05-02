import { useEffect } from 'react';

import { useDiagnostics } from '@/shared/diagnostics';
import { createGlobalErrorHandlers } from './global-error-handlers';

export function useGlobalErrorHandlers(onError: (message: string) => void) {
    const { record } = useDiagnostics();

    useEffect(() => {
        const handlers = createGlobalErrorHandlers({
            isDev: import.meta.env.DEV,
            onError,
            record: (message) => {
                record({
                    category: 'app',
                    severity: 'error',
                    message,
                });
            },
        });

        window.addEventListener('error', handlers.handleError);
        window.addEventListener('unhandledrejection', handlers.handleRejection);
        return () => {
            window.removeEventListener('error', handlers.handleError);
            window.removeEventListener('unhandledrejection', handlers.handleRejection);
        };
    }, [onError, record]);
}
