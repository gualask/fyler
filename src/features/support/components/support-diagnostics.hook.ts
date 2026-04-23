import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAppMetadata, openExternalUrl, saveTextFile } from '@/infra/platform';
import {
    type AppMetadata,
    type DiagnosticsSnapshot,
    formatDiagnosticsReport,
    toDiagnosticMessage,
    useDiagnostics,
} from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { buildGitHubIssueOpenTarget } from './support-github-issue-url';

const FALLBACK_APP_METADATA: AppMetadata = {
    appName: 'Fyler',
    version: 'unknown',
    identifier: 'unknown',
    platform: 'unknown',
    arch: 'unknown',
};

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

/**
 * Collects a `DiagnosticsSnapshot` for the support dialog and exposes user actions
 * (open/close, copy report, open GitHub issues).
 *
 * This hook also records notable events into the diagnostics stream.
 */
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
    const [isSupportDialogOpen, setIsSupportDialogOpen] = useState(false);
    const [appMetadata, setAppMetadata] = useState<AppMetadata>(FALLBACK_APP_METADATA);

    useEffect(() => {
        record({ category: 'app', severity: 'info', message: 'App session started' });
        void getAppMetadata()
            .then((metadata) => setAppMetadata(metadata))
            .catch(() => {
                // Keep fallback metadata in dev or non-Tauri env.
            });
    }, [record]);

    const diagnosticsSnapshot = useMemo<DiagnosticsSnapshot>(
        () => ({
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
        }),
        [
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
        ],
    );

    const openReportBug = useCallback(() => setIsSupportDialogOpen(true), []);
    const closeSupportDialog = useCallback(() => setIsSupportDialogOpen(false), []);

    const buildDiagnosticsReport = useCallback(
        () => formatDiagnosticsReport(diagnosticsSnapshot),
        [diagnosticsSnapshot],
    );

    const copyDiagnostics = useCallback(async () => {
        const diagnosticsReport = buildDiagnosticsReport();
        try {
            await navigator.clipboard.writeText(diagnosticsReport);
            record({
                category: 'support',
                severity: 'info',
                message: 'Diagnostics copied to clipboard',
            });
        } catch (error) {
            record({
                category: 'support',
                severity: 'error',
                message: `Copy diagnostics failed: ${toDiagnosticMessage(error)}`,
            });
            throw error;
        }
    }, [buildDiagnosticsReport, record]);

    const saveDiagnosticsFile = useCallback(
        async ({
            defaultFilename,
            filterLabel,
        }: {
            defaultFilename: string;
            filterLabel: string;
        }) => {
            const diagnosticsReport = buildDiagnosticsReport();
            try {
                const path = await saveTextFile(defaultFilename, filterLabel, diagnosticsReport);
                if (path) {
                    record({
                        category: 'support',
                        severity: 'info',
                        message: 'Saved diagnostics file',
                        metadata: { path },
                    });
                }
                return path;
            } catch (error) {
                record({
                    category: 'support',
                    severity: 'error',
                    message: `Save diagnostics file failed: ${toDiagnosticMessage(error)}`,
                });
                throw error;
            }
        },
        [buildDiagnosticsReport, record],
    );

    const openGitHubIssue = useCallback(
        async ({ title, body }: { title: string; body: string }) => {
            const target = buildGitHubIssueOpenTarget({ title, body });
            try {
                await openExternalUrl(target.url);
                record({
                    category: 'support',
                    severity: 'info',
                    message:
                        target.kind === 'prefilled'
                            ? 'Opened GitHub new issue (prefilled)'
                            : 'Opened GitHub new issue (blank fallback)',
                });
                return target.kind;
            } catch (error) {
                record({
                    category: 'support',
                    severity: 'error',
                    message: `Open GitHub new issue failed: ${toDiagnosticMessage(error)}`,
                });
                throw error;
            }
        },
        [record],
    );

    return {
        isSupportDialogOpen,
        diagnosticsSnapshot,
        openReportBug,
        closeSupportDialog,
        copyDiagnostics,
        saveDiagnosticsFile,
        openGitHubIssue,
    };
}
