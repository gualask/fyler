import { useCallback } from 'react';
import { toDiagnosticMessage, useDiagnostics } from '@/diagnostics';
import type { useAppNotifications } from './app-notifications.hook';
import type { useQuickAdd } from './quick-add.hook';

interface QuickAddActionsDeps {
    quickAdd: ReturnType<typeof useQuickAdd>;
    notifications: ReturnType<typeof useAppNotifications>;
}

export function useQuickAddActions({ quickAdd, notifications }: QuickAddActionsDeps) {
    const { record } = useDiagnostics();

    const handleEnterQuickAdd = useCallback(() => {
        void quickAdd
            .enterQuickAdd()
            .then(() => {
                record({
                    category: 'quick-add',
                    severity: 'info',
                    message: 'Entered Quick Add mode',
                });
            })
            .catch((error) => {
                record({
                    category: 'quick-add',
                    severity: 'error',
                    message: `Failed to enter Quick Add: ${toDiagnosticMessage(error)}`,
                });
                notifications.showError(error);
            });
    }, [notifications, quickAdd, record]);

    const handleExitQuickAdd = useCallback(() => {
        void quickAdd
            .exitQuickAdd()
            .then(() => {
                record({
                    category: 'quick-add',
                    severity: 'info',
                    message: 'Exited Quick Add mode',
                });
            })
            .catch((error) => {
                record({
                    category: 'quick-add',
                    severity: 'error',
                    message: `Failed to exit Quick Add: ${toDiagnosticMessage(error)}`,
                });
                notifications.showError(error);
            });
    }, [notifications, quickAdd, record]);

    return { handleEnterQuickAdd, handleExitQuickAdd };
}
