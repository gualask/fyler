import { useCallback } from 'react';

import { toDiagnosticMessage } from '@/diagnostics';
import { useDiagnostics } from '@/diagnostics/useDiagnostics';
import type { useFiles } from '@/files/useFiles';
import { formatSkippedFile, useTranslation } from '@/i18n';
import type { useAppNotifications } from './useAppNotifications';

interface AddFilesActionDeps {
    files: ReturnType<typeof useFiles>;
    notifications: ReturnType<typeof useAppNotifications>;
}

export function useAddFilesAction({ files, notifications }: AddFilesActionDeps) {
    const { record } = useDiagnostics();
    const { t } = useTranslation();

    const handleAddFiles = useCallback(() => {
        record({ category: 'files', severity: 'info', message: 'Open files dialog started' });
        notifications.showOpeningFiles();
        void files.addFiles()
            .then(({ files: addedFiles, skippedErrors }) => {
                record({
                    category: 'files',
                    severity: 'info',
                    message: addedFiles.length ? 'Files added to workspace' : 'Open files dialog canceled',
                    metadata: { addedCount: addedFiles.length },
                });
                if (skippedErrors.length > 0 && addedFiles.length === 0) {
                    notifications.showError(skippedErrors.map((s) => formatSkippedFile(s, t)).join(', '));
                }
            })
            .catch((error) => {
                record({
                    category: 'files',
                    severity: 'error',
                    message: `Open files failed: ${toDiagnosticMessage(error)}`,
                });
                notifications.showError(error);
            })
            .finally(() => notifications.clearLoading());
    }, [files, notifications, record, t]);

    return handleAddFiles;
}
