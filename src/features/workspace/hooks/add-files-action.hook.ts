import { useCallback } from 'react';

import type { AppNotificationsApi } from '@/shared/contracts/app-notifications.api';
import { toDiagnosticMessage, useDiagnostics } from '@/shared/diagnostics';
import { formatSkippedFile, useTranslation } from '@/shared/i18n';
import type { useWorkspace } from './workspace.hook';

interface AddFilesActionDeps {
    workspace: ReturnType<typeof useWorkspace>;
    notifications: AppNotificationsApi;
}

export function useAddFilesAction({ workspace, notifications }: AddFilesActionDeps) {
    const { record } = useDiagnostics();
    const { t } = useTranslation();

    const handleAddFiles = useCallback(() => {
        record({ category: 'files', severity: 'info', message: 'Open files dialog started' });
        notifications.showOpeningFiles();
        void workspace
            .addFiles()
            .then(({ files: addedFiles, skippedErrors }) => {
                record({
                    category: 'files',
                    severity: 'info',
                    message: addedFiles.length
                        ? 'Files added to workspace'
                        : 'Open files dialog canceled',
                    metadata: { addedCount: addedFiles.length },
                });
                if (skippedErrors.length > 0 && addedFiles.length === 0) {
                    notifications.showError(
                        skippedErrors.map((s) => formatSkippedFile(s, t)).join(', '),
                    );
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
    }, [notifications, record, t, workspace]);

    return handleAddFiles;
}
