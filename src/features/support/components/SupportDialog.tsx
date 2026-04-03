import { useEffect, useState } from 'react';

import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

import { SupportAboutSection } from './sections/AboutSection';
import { SupportActionBanner } from './sections/ActionBanner';
import { SupportAppSection } from './sections/AppSection';
import { SupportReportSections } from './sections/report/ReportSections';

type SupportDialogMode = 'report' | 'about';
type ActionState = {
    tone: 'success' | 'error';
    message: string;
} | null;

interface Props {
    mode: SupportDialogMode | null;
    snapshot: DiagnosticsSnapshot;
    onClose: () => void;
    onCopyDiagnostics: () => Promise<void>;
    onOpenGitHubIssues: () => Promise<void>;
    onOpenReportBug: () => void;
}

export function SupportDialog({
    mode,
    snapshot,
    onClose,
    onCopyDiagnostics,
    onOpenGitHubIssues,
    onOpenReportBug,
}: Props) {
    const { t } = useTranslation();
    const [actionState, setActionState] = useState<ActionState>(null);

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

    if (!mode) return null;

    const isReport = mode === 'report';
    const recentEvents = isReport ? [...snapshot.recentEvents].reverse() : [];

    async function runAction(action: () => Promise<void>, successMessage: string) {
        try {
            await action();
            setActionState({ tone: 'success', message: successMessage });
        } catch (error) {
            setActionState({
                tone: 'error',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    }

    const title = t(isReport ? 'support.dialog.reportTitle' : 'support.dialog.aboutTitle');
    const description = t(
        isReport ? 'support.dialog.reportDescription' : 'support.dialog.aboutDescription',
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
            onMouseDown={(event) => {
                if (event.target === event.currentTarget) {
                    onClose();
                }
            }}
        >
            <div className="w-full max-w-2xl rounded-2xl border border-ui-border bg-ui-surface shadow-2xl">
                <div className="border-b border-ui-border px-6 py-5">
                    <h2 className="text-lg font-semibold text-ui-text">{title}</h2>
                    <p className="mt-1 text-sm text-ui-text-muted">{description}</p>
                </div>

                <div className="max-h-[70vh] space-y-5 overflow-y-auto px-6 py-5">
                    <SupportAppSection snapshot={snapshot} />

                    {isReport ? (
                        <SupportReportSections snapshot={snapshot} recentEvents={recentEvents} />
                    ) : (
                        <SupportAboutSection />
                    )}

                    <SupportActionBanner actionState={actionState} />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ui-border px-6 py-4">
                    <div className="flex flex-wrap gap-2">
                        {isReport ? (
                            <button
                                type="button"
                                className="btn-ghost"
                                onClick={() =>
                                    void runAction(
                                        onCopyDiagnostics,
                                        t('support.feedback.copySuccess'),
                                    )
                                }
                            >
                                {t('support.copyDiagnostics')}
                            </button>
                        ) : (
                            <button type="button" className="btn-ghost" onClick={onOpenReportBug}>
                                {t('support.reportBug')}
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn-ghost"
                            onClick={() =>
                                void runAction(
                                    onOpenGitHubIssues,
                                    t('support.feedback.issuesOpened'),
                                )
                            }
                        >
                            {t('support.githubIssues')}
                        </button>
                    </div>
                    <button type="button" className="btn-primary" onClick={onClose}>
                        {t('support.close')}
                    </button>
                </div>
            </div>
        </div>
    );
}
