import { useCallback } from 'react';

import { buildMergeRequest } from '@/domain';
import { toDiagnosticMessage } from '@/diagnostics';
import { useDiagnostics } from '@/diagnostics/useDiagnostics';
import { mergePDFs, savePDFDialog } from '@/platform';
import type { useFiles } from '@/files/useFiles';
import type { useAppNotifications } from './useAppNotifications';
import type { useQuickAdd } from './useQuickAdd';
import type { useOptimize } from './useOptimize';
import { useTranslation } from '@/i18n';

interface Deps {
    files: ReturnType<typeof useFiles>;
    notifications: ReturnType<typeof useAppNotifications>;
    quickAdd: ReturnType<typeof useQuickAdd>;
    optimize: ReturnType<typeof useOptimize>;
}

export function useAppActions({ files, notifications, quickAdd, optimize }: Deps) {
    const { t } = useTranslation();
    const { record } = useDiagnostics();

    const exportMerged = useCallback(async () => {
        if (files.finalPages.length === 0) return;
        try {
            const outputPath = await savePDFDialog(
                t('header.defaultExportFilename'),
                t('dialogs.filters.pdf'),
            );
            if (!outputPath) return;
            const req = buildMergeRequest(
                files.finalPages,
                files.editsByFile,
                outputPath,
                optimize.optimizeOptions,
            );
            record({
                category: 'export',
                severity: 'info',
                message: 'PDF export started',
                metadata: {
                    pageCount: files.finalPages.length,
                    optimizationPreset: optimize.optimizationPreset,
                    imageFit: optimize.imageFit,
                },
            });
            notifications.showMergePreparing();
            const result = await mergePDFs(req);
            if (result.optimizationFailedCount > 0) {
                record({
                    category: 'export',
                    severity: 'warn',
                    message: 'PDF export completed with optimization warnings',
                    metadata: { optimizationFailedCount: result.optimizationFailedCount },
                });
                notifications.showExportCompletedWithOptimizationWarning(result.optimizationFailedCount);
            } else {
                record({
                    category: 'export',
                    severity: 'info',
                    message: 'PDF export completed successfully',
                    metadata: { pageCount: files.finalPages.length },
                });
                notifications.showExportCompleted();
            }
        } catch (error) {
            record({
                category: 'export',
                severity: 'error',
                message: `PDF export failed: ${toDiagnosticMessage(error)}`,
            });
            notifications.showError(error);
        } finally {
            notifications.clearLoading();
        }
    }, [files.editsByFile, files.finalPages, notifications, optimize.imageFit, optimize.optimizationPreset, optimize.optimizeOptions, record, t]);

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
                    notifications.showError(skippedErrors.join(', '));
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
    }, [files, notifications, record]);

    const handleEnterQuickAdd = useCallback(() => {
        void quickAdd.enterQuickAdd()
            .then(() => {
                record({ category: 'quick-add', severity: 'info', message: 'Entered Quick Add mode' });
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
        void quickAdd.exitQuickAdd()
            .then(() => {
                record({ category: 'quick-add', severity: 'info', message: 'Exited Quick Add mode' });
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

    return { exportMerged, handleAddFiles, handleEnterQuickAdd, handleExitQuickAdd };
}
