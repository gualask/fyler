import { useCallback } from 'react';
import { toDiagnosticMessage, useDiagnostics } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import type { FileEdits, FinalPage } from '../model/merge.types';
import type { useOptimize } from '../model/optimize.hook';
import { useMergeExportPort } from './merge.port';
import { buildMergeRequest } from './merge-request.mapper';
import type { MergeNotificationsApi } from './notifications.port';

interface ExportActionDeps {
    finalPages: FinalPage[];
    editsByFile: Record<string, FileEdits>;
    notifications: MergeNotificationsApi;
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
export function useExportAction({
    finalPages,
    editsByFile,
    notifications,
    optimize,
}: ExportActionDeps) {
    const { t } = useTranslation();
    const { record } = useDiagnostics();
    const mergePort = useMergeExportPort();

    const exportMerged = useCallback(async () => {
        if (finalPages.length === 0 || notifications.isBusy) return;
        let mergeStarted = false;
        try {
            const outputPath = await mergePort.savePDFDialog(
                t('header.defaultExportFilename'),
                t('dialogs.filters.pdf'),
            );
            if (!outputPath) return;
            if (!notifications.beginMerge()) return;
            mergeStarted = true;
            const req = buildMergeRequest(
                finalPages,
                editsByFile,
                outputPath,
                optimize.imageFit,
                optimize.optimizeOptions,
            );
            record({
                category: 'export',
                severity: 'info',
                message: 'PDF export started',
                metadata: {
                    pageCount: finalPages.length,
                    optimizationPreset: optimize.optimizationPreset,
                    imageFit: optimize.imageFit,
                },
            });
            const result = await mergePort.mergePDFs(req);
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
                    metadata: { pageCount: finalPages.length },
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
            if (mergeStarted) notifications.finishMerge();
        }
    }, [
        editsByFile,
        finalPages,
        mergePort,
        notifications,
        optimize.imageFit,
        optimize.optimizationPreset,
        optimize.optimizeOptions,
        record,
        t,
    ]);

    return exportMerged;
}
