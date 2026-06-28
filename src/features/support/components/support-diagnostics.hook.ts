import { useCallback, useEffect, useMemo, useState } from 'react';
import { getAppMetadata, openExternalUrl, saveTextFile } from '@/infra/platform';
import {
    type AppMetadata,
    type DiagnosticEntry,
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

type RecordDiagnostic = (entry: Omit<DiagnosticEntry, 'id' | 'timestamp'>) => void;

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

type SnapshotOptions = Params & {
    appMetadata: AppMetadata;
    entries: DiagnosticEntry[];
    locale: string;
};

type SaveDiagnosticsOptions = {
    defaultFilename: string;
    filterLabel: string;
};

type GitHubIssueDraft = {
    title: string;
    body: string;
};

function useAppMetadata(record: RecordDiagnostic): AppMetadata {
    const [appMetadata, setAppMetadata] = useState<AppMetadata>(FALLBACK_APP_METADATA);

    useEffect(() => {
        record({ category: 'app', severity: 'info', message: 'App session started' });
        void getAppMetadata()
            .then((metadata) => setAppMetadata(metadata))
            .catch(() => {
                // Keep fallback metadata in dev or non-Tauri env.
            });
    }, [record]);

    return appMetadata;
}

function buildDiagnosticsSnapshot({
    appMetadata,
    entries,
    locale,
    isDark,
    isQuickAdd,
    fileCount,
    finalPageCount,
    optimizationPreset,
    imageFit,
    targetDpi,
    jpegQuality,
}: SnapshotOptions): DiagnosticsSnapshot {
    return {
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
    };
}

function recordSupportError(record: RecordDiagnostic, label: string, error: unknown) {
    record({
        category: 'support',
        severity: 'error',
        message: `${label} failed: ${toDiagnosticMessage(error)}`,
    });
}

async function copyDiagnosticsReport(diagnosticsReport: string, record: RecordDiagnostic) {
    try {
        await navigator.clipboard.writeText(diagnosticsReport);
        record({
            category: 'support',
            severity: 'info',
            message: 'Diagnostics copied to clipboard',
        });
    } catch (error) {
        recordSupportError(record, 'Copy diagnostics', error);
        throw error;
    }
}

async function saveDiagnosticsReportFile(
    { defaultFilename, filterLabel }: SaveDiagnosticsOptions,
    diagnosticsReport: string,
    record: RecordDiagnostic,
) {
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
        recordSupportError(record, 'Save diagnostics file', error);
        throw error;
    }
}

async function openGitHubIssueTarget({ title, body }: GitHubIssueDraft, record: RecordDiagnostic) {
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
        recordSupportError(record, 'Open GitHub new issue', error);
        throw error;
    }
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
    const appMetadata = useAppMetadata(record);

    const diagnosticsSnapshot = useMemo<DiagnosticsSnapshot>(
        () =>
            buildDiagnosticsSnapshot({
                appMetadata,
                entries,
                locale,
                isDark,
                isQuickAdd,
                fileCount,
                finalPageCount,
                optimizationPreset,
                imageFit,
                targetDpi,
                jpegQuality,
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
        await copyDiagnosticsReport(buildDiagnosticsReport(), record);
    }, [buildDiagnosticsReport, record]);

    const saveDiagnosticsFile = useCallback(
        async (options: SaveDiagnosticsOptions) => {
            return saveDiagnosticsReportFile(options, buildDiagnosticsReport(), record);
        },
        [buildDiagnosticsReport, record],
    );

    const openGitHubIssue = useCallback(
        async (draft: GitHubIssueDraft) => {
            return openGitHubIssueTarget(draft, record);
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
