import { useCallback, useEffect, useMemo, useState } from 'react';

import {
    formatDiagnosticsReport,
    toDiagnosticMessage,
    type AppMetadata,
    type DiagnosticsSnapshot,
} from '../../diagnostics';
import { useDiagnostics } from '../../diagnostics/useDiagnostics';
import { useTranslation } from '../../i18n';
import { getAppMetadata, openExternalUrl } from '../../platform';

const FALLBACK_APP_METADATA: AppMetadata = {
    appName: 'Fyler',
    version: 'unknown',
    identifier: 'unknown',
    platform: 'unknown',
    arch: 'unknown',
};
const GITHUB_ISSUES_URL = 'https://github.com/gualask/fyler/issues/new';

interface Params {
    isDark: boolean;
    isQuickAdd: boolean;
    fileCount: number;
    finalPageCount: number;
    optimizationPreset: string;
    imageFit: string;
    targetDpi?: number;
    jpegQuality?: number;
}

type SupportDialogMode = 'report' | 'about' | null;

export function useSupportDiagnostics({
    isDark,
    isQuickAdd,
    fileCount,
    finalPageCount,
    optimizationPreset,
    imageFit,
    targetDpi,
    jpegQuality,
}: Params) {
    const { locale } = useTranslation();
    const { entries, record } = useDiagnostics();
    const [supportDialogMode, setSupportDialogMode] = useState<SupportDialogMode>(null);
    const [appMetadata, setAppMetadata] = useState<AppMetadata>(FALLBACK_APP_METADATA);

    useEffect(() => {
        record({ category: 'app', severity: 'info', message: 'App session started' });
        void getAppMetadata()
            .then((metadata) => setAppMetadata(metadata))
            .catch(() => {
                // Keep fallback metadata in dev or non-Tauri env.
            });
    }, [record]);

    const diagnosticsSnapshot = useMemo<DiagnosticsSnapshot>(() => ({
        generatedAt: new Date().toISOString(),
        app: appMetadata,
        preferences: {
            locale,
            theme: isDark ? 'dark' : 'light',
        },
        session: {
            quickAdd: isQuickAdd,
            fileCount,
            finalPageCount,
            optimizationPreset,
            imageFit,
            targetDpi: targetDpi ?? null,
            jpegQuality: jpegQuality ?? null,
        },
        recentEvents: entries,
    }), [
        appMetadata,
        entries,
        fileCount,
        finalPageCount,
        imageFit,
        isDark,
        isQuickAdd,
        jpegQuality,
        locale,
        optimizationPreset,
        targetDpi,
    ]);

    const diagnosticsReport = useMemo(
        () => formatDiagnosticsReport(diagnosticsSnapshot),
        [diagnosticsSnapshot],
    );

    const openReportBug = useCallback(() => setSupportDialogMode('report'), []);
    const openAbout = useCallback(() => setSupportDialogMode('about'), []);
    const closeSupportDialog = useCallback(() => setSupportDialogMode(null), []);

    const logFilesDialogStarted = useCallback(() => {
        record({ category: 'files', severity: 'info', message: 'Open files dialog started' });
    }, [record]);

    const logFilesDialogResult = useCallback((addedCount: number) => {
        record({
            category: 'files',
            severity: 'info',
            message: addedCount ? 'Files added to workspace' : 'Open files dialog canceled',
            metadata: { addedCount },
        });
    }, [record]);

    const logFilesDialogFailure = useCallback((error: unknown) => {
        record({
            category: 'files',
            severity: 'error',
            message: `Open files failed: ${toDiagnosticMessage(error)}`,
        });
    }, [record]);

    const logQuickAddSuccess = useCallback((action: 'enter' | 'exit') => {
        record({
            category: 'quick-add',
            severity: 'info',
            message: action === 'enter' ? 'Entered Quick Add mode' : 'Exited Quick Add mode',
        });
    }, [record]);

    const logQuickAddFailure = useCallback((action: 'enter' | 'exit', error: unknown) => {
        record({
            category: 'quick-add',
            severity: 'error',
            message: `${action === 'enter' ? 'Failed to enter' : 'Failed to exit'} Quick Add: ${toDiagnosticMessage(error)}`,
        });
    }, [record]);

    const logExportStarted = useCallback((pageCount: number) => {
        record({
            category: 'export',
            severity: 'info',
            message: 'PDF export started',
            metadata: {
                pageCount,
                optimizationPreset,
                imageFit,
            },
        });
    }, [imageFit, optimizationPreset, record]);

    const logExportCompleted = useCallback((pageCount: number) => {
        record({
            category: 'export',
            severity: 'info',
            message: 'PDF export completed successfully',
            metadata: { pageCount },
        });
    }, [record]);

    const logExportWarning = useCallback((optimizationFailedCount: number) => {
        record({
            category: 'export',
            severity: 'warn',
            message: 'PDF export completed with optimization warnings',
            metadata: { optimizationFailedCount },
        });
    }, [record]);

    const logExportFailure = useCallback((error: unknown) => {
        record({
            category: 'export',
            severity: 'error',
            message: `PDF export failed: ${toDiagnosticMessage(error)}`,
        });
    }, [record]);

    const copyDiagnostics = useCallback(async () => {
        try {
            await navigator.clipboard.writeText(diagnosticsReport);
            record({ category: 'support', severity: 'info', message: 'Diagnostics copied to clipboard' });
        } catch (error) {
            record({
                category: 'support',
                severity: 'error',
                message: `Copy diagnostics failed: ${toDiagnosticMessage(error)}`,
            });
            throw error;
        }
    }, [diagnosticsReport, record]);

    const openGitHubIssues = useCallback(async () => {
        try {
            await openExternalUrl(GITHUB_ISSUES_URL);
            record({ category: 'support', severity: 'info', message: 'Opened GitHub issues page' });
        } catch (error) {
            record({
                category: 'support',
                severity: 'error',
                message: `Open GitHub issues failed: ${toDiagnosticMessage(error)}`,
            });
            throw error;
        }
    }, [record]);

    return {
        supportDialogMode,
        diagnosticsSnapshot,
        openReportBug,
        openAbout,
        closeSupportDialog,
        copyDiagnostics,
        openGitHubIssues,
        logFilesDialogStarted,
        logFilesDialogResult,
        logFilesDialogFailure,
        logQuickAddSuccess,
        logQuickAddFailure,
        logExportStarted,
        logExportCompleted,
        logExportWarning,
        logExportFailure,
    };
}
