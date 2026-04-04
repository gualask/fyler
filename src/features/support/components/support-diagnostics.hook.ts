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

const FALLBACK_APP_METADATA: AppMetadata = {
    appName: 'Fyler',
    version: 'unknown',
    identifier: 'unknown',
    platform: 'unknown',
    arch: 'unknown',
};
const GITHUB_NEW_ISSUE_URL = 'https://github.com/gualask/fyler/issues/new';
const MAX_GITHUB_ISSUE_URL_LENGTH = 8000;

function buildGitHubNewIssueUrl({ title, body }: { title: string; body: string }) {
    const url = `${GITHUB_NEW_ISSUE_URL}?title=${encodeURIComponent(title)}&body=${encodeURIComponent(body)}`;
    return url.length <= MAX_GITHUB_ISSUE_URL_LENGTH ? url : null;
}

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

    const openReportBug = useCallback(() => setSupportDialogMode('report'), []);
    const openAbout = useCallback(() => setSupportDialogMode('about'), []);
    const closeSupportDialog = useCallback(() => setSupportDialogMode(null), []);

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
            const url = buildGitHubNewIssueUrl({ title, body });
            try {
                await openExternalUrl(url ?? GITHUB_NEW_ISSUE_URL);
                record({
                    category: 'support',
                    severity: 'info',
                    message: url
                        ? 'Opened GitHub new issue (prefilled)'
                        : 'Opened GitHub new issue (blank fallback)',
                });
                return url ? 'prefilled' : 'blank_fallback';
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
        supportDialogMode,
        diagnosticsSnapshot,
        openReportBug,
        openAbout,
        closeSupportDialog,
        copyDiagnostics,
        saveDiagnosticsFile,
        openGitHubIssue,
    };
}
