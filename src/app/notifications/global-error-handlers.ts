import { getErrorMessage } from '../../shared/errors/app-error';

interface CreateGlobalErrorHandlersArgs {
    isDev: boolean;
    onError: (message: string) => void;
    record: (message: string) => void;
}

interface ErrorLikeEvent {
    preventDefault: () => void;
    error?: unknown;
    message?: string;
}

interface RejectionLikeEvent {
    preventDefault: () => void;
    reason?: unknown;
}

export function createGlobalErrorHandlers({
    isDev,
    onError,
    record,
}: CreateGlobalErrorHandlersArgs) {
    return {
        handleError(event: ErrorLikeEvent) {
            if (!isDev) {
                event.preventDefault();
            }

            const message = getErrorMessage(event.error ?? event.message);
            record(`Unhandled window error: ${message}`);
            onError(message);
        },
        handleRejection(event: RejectionLikeEvent) {
            if (!isDev) {
                event.preventDefault();
            }

            const message = getErrorMessage(event.reason);
            record(`Unhandled promise rejection: ${message}`);
            onError(message);
        },
    };
}
