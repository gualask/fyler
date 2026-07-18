import { useCallback } from 'react';

import type { AppNotificationsApi } from '@/shared/contracts/app-notifications.api';
import { toDiagnosticMessage, useDiagnostics } from '@/shared/diagnostics';
import { classifyAddFilesResult } from './add-files-action-result';
import type { useWorkspace } from './workspace';

interface AddFilesActionDeps {
    workspace: ReturnType<typeof useWorkspace>;
    notifications: AppNotificationsApi;
}

export function useAddFilesAction({ workspace, notifications }: AddFilesActionDeps) {
    const { record } = useDiagnostics();

    const handleAddFiles = useCallback(() => {
        if (!notifications.beginOpeningFiles()) return;
        record({ category: 'files', severity: 'info', message: 'Open files dialog started' });
        void workspace
            .addFiles({ onImportReady: notifications.finishOpeningFiles })
            .then(({ files: addedFiles, skippedErrors }) => {
                const result = classifyAddFilesResult({
                    addedCount: addedFiles.length,
                    skippedCount: skippedErrors.length,
                });

                record({
                    category: 'files',
                    severity: result.diagnosticSeverity,
                    message: result.diagnosticMessage,
                    metadata: result.metadata,
                });
            })
            .catch((error) => {
                record({
                    category: 'files',
                    severity: 'error',
                    message: `Open files failed: ${toDiagnosticMessage(error)}`,
                });
                notifications.showError(error);
            })
            .finally(() => notifications.finishOpeningFiles());
    }, [notifications, record, workspace]);

    return handleAddFiles;
}
