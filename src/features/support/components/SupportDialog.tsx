import { IconChevronDown } from '@tabler/icons-react';
import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { useModalFocus } from '@/shared/ui';

import { SupportIssueFormCard } from './sections/report/IssueFormCard';
import { SupportReportSections } from './sections/report/ReportSections';
import { openSupportIssue } from './support-issue-flow';
import { buildGitHubIssueBody } from './support-issue-report';

interface Props {
    open: boolean;
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
    open,
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
    const [showTechnicalDetails, setShowTechnicalDetails] = useState(false);
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const technicalDetailsId = useId();

    useModalFocus({
        active: open,
        containerRef: dialogRef,
        onEscape: onClose,
    });

    useEffect(() => {
        if (!open) {
            setIssueTitle('');
            setIssueDescription('');
            setShowTechnicalDetails(false);
        }
    }, [open]);

    const recentEvents = useMemo(
        () => [...snapshot.recentEvents].reverse(),
        [snapshot.recentEvents],
    );

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
            const result = await openSupportIssue({
                copyDiagnostics: onCopyDiagnostics,
                openGitHubIssue: onOpenGitHubIssue,
                title: normalizedIssueTitle,
                body: buildGitHubIssueBody({
                    problem: normalizedIssueDescription,
                    snapshot,
                }),
            });

            if (result.openResult === 'blank_fallback') {
                onShowToast('warning', t('support.feedback.issueOpenedFallback'));
                return;
            }

            if (!result.diagnosticsCopied) {
                onShowToast('warning', t('support.feedback.issueOpenedWithoutDiagnostics'));
                return;
            }

            onShowToast('success', t('support.feedback.issueOpenedWithDiagnostics'));
        } catch (error) {
            onShowError(error);
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <motion.div
                    className="dialog-backdrop dialog-backdrop-padded"
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
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        tabIndex={-1}
                        className="dialog-panel dialog-panel-bordered w-full max-w-2xl rounded-2xl"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="flex items-start justify-between gap-4 border-b border-ui-border px-6 py-5">
                            <h2 id={titleId} className="min-w-0 text-lg font-semibold text-ui-text">
                                {t('support.dialog.reportTitle')}
                            </h2>
                            <span className="shrink-0 pt-1 text-[10px] font-medium tracking-[0.12em] text-ui-text-muted/85 select-text">
                                v{snapshot.app.version}
                            </span>
                        </div>

                        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-6 py-5">
                            <SupportIssueFormCard
                                title={issueTitle}
                                description={issueDescription}
                                onTitleChange={setIssueTitle}
                                onDescriptionChange={setIssueDescription}
                            />

                            <section className="border-t border-ui-border/70 pt-4">
                                <button
                                    type="button"
                                    aria-expanded={showTechnicalDetails}
                                    aria-controls={technicalDetailsId}
                                    className="group flex w-full items-start justify-between gap-4 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-ui-bg/20 hover:text-ui-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-muted focus-visible:ring-offset-2 focus-visible:ring-offset-ui-surface"
                                    onClick={() => setShowTechnicalDetails((current) => !current)}
                                >
                                    <div className="min-w-0">
                                        <p className="text-sm font-semibold text-ui-text">
                                            {t('support.dialog.technicalDetailsTitle')}
                                        </p>
                                        <p className="mt-1 max-w-[54ch] text-xs leading-5 text-ui-text-muted">
                                            {t('support.dialog.technicalDetailsDescription')}
                                        </p>
                                    </div>
                                    <IconChevronDown
                                        aria-hidden="true"
                                        className={[
                                            'mt-0.5 h-4 w-4 shrink-0 text-ui-text-muted transition-transform duration-200 group-hover:text-ui-text-secondary',
                                            showTechnicalDetails ? 'rotate-180' : '',
                                        ].join(' ')}
                                    />
                                </button>

                                {showTechnicalDetails ? (
                                    <div
                                        id={technicalDetailsId}
                                        className="mt-3 rounded-xl border border-ui-border/70 bg-ui-bg/20 px-4 py-4"
                                    >
                                        <SupportReportSections
                                            snapshot={snapshot}
                                            recentEvents={recentEvents}
                                        />
                                    </div>
                                ) : null}
                            </section>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border px-6 py-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <button
                                    type="button"
                                    className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-muted focus-visible:ring-offset-2 focus-visible:ring-offset-ui-surface"
                                    onClick={() => void handleCopyDiagnostics()}
                                >
                                    {t('support.copyDiagnostics')}
                                </button>
                                <button
                                    type="button"
                                    className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ui-accent-muted focus-visible:ring-offset-2 focus-visible:ring-offset-ui-surface"
                                    onClick={() => void handleSaveDiagnostics()}
                                >
                                    {t('support.saveDiagnostics')}
                                </button>
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                                <button type="button" className="btn-ghost" onClick={onClose}>
                                    {t('support.close')}
                                </button>
                                <button
                                    type="button"
                                    className="btn-primary"
                                    disabled={!canOpenIssue}
                                    onClick={() => void handleOpenGitHubIssue()}
                                >
                                    {t('support.openGitHubIssue')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
