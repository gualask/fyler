import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useState } from 'react';

import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

import { SupportAboutSection } from './sections/AboutSection';
import { SupportAppSection } from './sections/AppSection';
import { SupportIssueFormCard } from './sections/report/IssueFormCard';
import { SupportReportSections } from './sections/report/ReportSections';

type SupportDialogMode = 'report' | 'about';

function buildGitHubIssueBody({
    problem,
    snapshot,
}: {
    problem: string;
    snapshot: DiagnosticsSnapshot;
}) {
    return [
        '## Problem',
        problem,
        '',
        '## Steps to reproduce',
        '1. ',
        '',
        '## Expected',
        '',
        '## Actual',
        '',
        '## Environment',
        `- Fyler version: ${snapshot.app.version}`,
        `- Platform: ${snapshot.app.platform} (${snapshot.app.arch})`,
        `- Locale: ${snapshot.preferences.locale}`,
        `- Theme: ${snapshot.preferences.theme}`,
        '',
        '## Diagnostics',
        '_Paste the diagnostics from clipboard here (Copy diagnostics)._',
        '',
    ].join('\n');
}

interface Props {
    mode: SupportDialogMode | null;
    snapshot: DiagnosticsSnapshot;
    onClose: () => void;
    onCopyDiagnostics: () => Promise<void>;
    onSaveDiagnosticsFile: (params: {
        defaultFilename: string;
        filterLabel: string;
    }) => Promise<string>;
    onOpenGitHubIssue: (params: {
        title: string;
        body: string;
    }) => Promise<'prefilled' | 'blank_fallback'>;
    onShowToast: (tone: 'success' | 'warning', message: string) => void;
    onShowError: (error: unknown) => void;
}

export function SupportDialog({
    mode,
    snapshot,
    onClose,
    onCopyDiagnostics,
    onSaveDiagnosticsFile,
    onOpenGitHubIssue,
    onShowToast,
    onShowError,
}: Props) {
    const { t } = useTranslation();
    const [issueTitle, setIssueTitle] = useState('');
    const [issueDescription, setIssueDescription] = useState('');

    useEffect(() => {
        if (!mode) return undefined;

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [mode, onClose]);

    useEffect(() => {
        if (!mode) {
            setIssueTitle('');
            setIssueDescription('');
        }
    }, [mode]);

    const isReport = mode === 'report';
    const recentEvents = isReport ? [...snapshot.recentEvents].reverse() : [];

    const title = mode
        ? t(isReport ? 'support.dialog.reportTitle' : 'support.dialog.aboutTitle')
        : '';
    const headerDescription = isReport ? t('support.dialog.reportDescription') : null;

    const normalizedIssueTitle = issueTitle.trim();
    const normalizedIssueDescription = issueDescription.trim();
    const canOpenIssue = Boolean(normalizedIssueTitle && normalizedIssueDescription);

    async function handleCopyDiagnostics() {
        try {
            await onCopyDiagnostics();
            onShowToast('success', t('support.feedback.copySuccess'));
        } catch (error) {
            onShowError(error);
        }
    }

    async function handleSaveDiagnostics() {
        try {
            const defaultFilename = `fyler-diagnostics-${snapshot.app.version}.txt`;
            const filterLabel = t('support.dialog.diagnosticsFileFilter');
            const path = await onSaveDiagnosticsFile({ defaultFilename, filterLabel });
            if (!path) return;
            onShowToast('success', t('support.feedback.diagnosticsSaved'));
        } catch (error) {
            onShowError(error);
        }
    }

    async function handleOpenGitHubIssue() {
        if (!canOpenIssue) return;

        try {
            await onCopyDiagnostics();
            const result = await onOpenGitHubIssue({
                title: normalizedIssueTitle,
                body: buildGitHubIssueBody({
                    problem: normalizedIssueDescription,
                    snapshot,
                }),
            });

            if (result === 'blank_fallback') {
                onShowToast('warning', t('support.feedback.issueOpenedFallback'));
                return;
            }

            onShowToast('success', t('support.feedback.issueOpenedWithDiagnostics'));
        } catch (error) {
            onShowError(error);
        }
    }

    return (
        <AnimatePresence>
            {mode && (
                <motion.div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    onMouseDown={(event) => {
                        if (event.target === event.currentTarget) {
                            onClose();
                        }
                    }}
                >
                    <motion.div
                        className="w-full max-w-2xl rounded-2xl border border-ui-border bg-ui-surface shadow-2xl"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="border-b border-ui-border px-6 py-5">
                            <h2 className="text-lg font-semibold text-ui-text">{title}</h2>
                            {headerDescription ? (
                                <p className="mt-1 text-sm text-ui-text-muted">
                                    {headerDescription}
                                </p>
                            ) : null}
                        </div>

                        <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
                            {isReport ? (
                                <>
                                    <SupportIssueFormCard
                                        title={issueTitle}
                                        description={issueDescription}
                                        onTitleChange={setIssueTitle}
                                        onDescriptionChange={setIssueDescription}
                                    />

                                    <details className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
                                        <summary className="cursor-pointer text-sm font-semibold text-ui-text">
                                            {t('support.dialog.diagnosticsPreview')}
                                        </summary>
                                        <div className="mt-4 space-y-5">
                                            <SupportAppSection snapshot={snapshot} />
                                            <SupportReportSections
                                                snapshot={snapshot}
                                                recentEvents={recentEvents}
                                            />
                                        </div>
                                    </details>
                                </>
                            ) : (
                                <>
                                    <SupportAboutSection />
                                    <SupportAppSection
                                        snapshot={snapshot}
                                        showIdentifier={false}
                                        showGeneratedAt={false}
                                    />
                                </>
                            )}
                        </div>

                        <div
                            className={[
                                'flex flex-wrap items-center gap-3 border-t border-ui-border px-6 py-4',
                                isReport ? 'justify-between' : 'justify-end',
                            ].join(' ')}
                        >
                            {isReport ? (
                                <div className="flex flex-wrap gap-2">
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => void handleCopyDiagnostics()}
                                    >
                                        {t('support.copyDiagnostics')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        onClick={() => void handleSaveDiagnostics()}
                                    >
                                        {t('support.saveDiagnostics')}
                                    </button>
                                    <button
                                        type="button"
                                        className="btn-ghost"
                                        disabled={!canOpenIssue}
                                        onClick={() => void handleOpenGitHubIssue()}
                                    >
                                        {t('support.openGitHubIssue')}
                                    </button>
                                </div>
                            ) : null}
                            <button type="button" className="btn-primary" onClick={onClose}>
                                {t('support.close')}
                            </button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
