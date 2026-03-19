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
    };
}
