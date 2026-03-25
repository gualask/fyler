import { useCallback } from 'react';

import { buildMergeRequest } from '@/domain';
import { toDiagnosticMessage } from '@/diagnostics';
import { useDiagnostics } from '@/diagnostics';
import { mergePDFs, savePDFDialog } from '@/platform';
import type { useFiles } from '@/files';
import type { useAppNotifications } from './app-notifications.hook';
import type { useOptimize } from './optimize.hook';
import { useTranslation } from '@/i18n';

interface ExportActionDeps {
    files: ReturnType<typeof useFiles>;
    notifications: ReturnType<typeof useAppNotifications>;
    optimize: ReturnType<typeof useOptimize>;
}

export function useExportAction({ files, notifications, optimize }: ExportActionDeps) {
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

    return exportMerged;
}
