import { useCallback } from 'react';

import type { WorkspaceApi } from '@/features/workspace';
import { mergePDFs, savePDFDialog } from '@/infra/platform';
import type { AppNotificationsApi } from '@/shared/contracts/app-notifications.api';
import { toDiagnosticMessage, useDiagnostics } from '@/shared/diagnostics';
import { buildMergeRequest } from '@/shared/domain/mappers/merge-request.mapper';
import { useTranslation } from '@/shared/i18n';
import type { useOptimize } from './optimize.hook';

interface ExportActionDeps {
    workspace: WorkspaceApi;
    notifications: AppNotificationsApi;
    optimize: ReturnType<typeof useOptimize>;
}

/**
 * Returns an async callback that exports the current composition as a single PDF.
 *
 * The callback:
 * - prompts the user for an output path
 * - records diagnostics metadata for support
 * - shows user-facing progress/toasts
 */
export function useExportAction({ workspace, notifications, optimize }: ExportActionDeps) {
    const { t } = useTranslation();
    const { record } = useDiagnostics();

    const exportMerged = useCallback(async () => {
        if (workspace.finalPages.length === 0) return;
        try {
            const outputPath = await savePDFDialog(
                t('header.defaultExportFilename'),
                t('dialogs.filters.pdf'),
            );
            if (!outputPath) return;
            const req = buildMergeRequest(
                workspace.finalPages,
                workspace.editsByFile,
                outputPath,
                optimize.optimizeOptions,
            );
            record({
                category: 'export',
                severity: 'info',
                message: 'PDF export started',
                metadata: {
                    pageCount: workspace.finalPages.length,
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
                notifications.showExportCompletedWithOptimizationWarning(
                    result.optimizationFailedCount,
                );
            } else {
                record({
                    category: 'export',
                    severity: 'info',
                    message: 'PDF export completed successfully',
                    metadata: { pageCount: workspace.finalPages.length },
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
    }, [
        workspace.editsByFile,
        workspace.finalPages,
        notifications,
        optimize.imageFit,
        optimize.optimizationPreset,
        optimize.optimizeOptions,
        record,
        t,
    ]);

    return exportMerged;
}
