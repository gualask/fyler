import { useEffect, useState } from 'react';

import type { DiagnosticsSnapshot } from '@/diagnostics';
import { useTranslation } from '@/i18n';

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

function SummaryRow({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="flex items-center justify-between gap-4 border-b border-ui-border/80 py-2 text-sm last:border-b-0">
            <span className="text-ui-text-muted">{label}</span>
            <span className="truncate text-right font-medium text-ui-text">{value}</span>
        </div>
    );
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
                    <section className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
                        <div className="mb-2 flex items-center justify-between gap-3">
                            <h3 className="text-sm font-semibold text-ui-text">
                                {snapshot.app.appName}
                            </h3>
                            <span className="rounded-full bg-ui-accent-soft px-2.5 py-1 text-xs font-semibold text-ui-accent-on-soft">
                                v{snapshot.app.version}
                            </span>
                        </div>
                        <SummaryRow
                            label={t('support.dialog.identifier')}
                            value={snapshot.app.identifier}
                        />
                        <SummaryRow
                            label={t('support.dialog.platform')}
                            value={`${snapshot.app.platform} (${snapshot.app.arch})`}
                        />
                        <SummaryRow
                            label={t('support.dialog.generatedAt')}
                            value={snapshot.generatedAt}
                        />
                    </section>

                    {isReport ? (
                        <>
                            <section className="grid gap-4 md:grid-cols-2">
                                <div className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
                                    <h3 className="mb-2 text-sm font-semibold text-ui-text">
                                        {t('support.dialog.preferences')}
                                    </h3>
                                    <SummaryRow
                                        label={t('support.dialog.locale')}
                                        value={snapshot.preferences.locale}
                                    />
                                    <SummaryRow
                                        label={t('support.dialog.theme')}
                                        value={snapshot.preferences.theme}
                                    />
                                </div>
                                <div className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
                                    <h3 className="mb-2 text-sm font-semibold text-ui-text">
                                        {t('support.dialog.session')}
                                    </h3>
                                    <SummaryRow
                                        label={t('support.dialog.quickAdd')}
                                        value={
                                            snapshot.session.quickAdd
                                                ? t('support.on')
                                                : t('support.off')
                                        }
                                    />
                                    <SummaryRow
                                        label={t('support.dialog.fileCount')}
                                        value={snapshot.session.fileCount}
                                    />
                                    <SummaryRow
                                        label={t('support.dialog.finalPageCount')}
                                        value={snapshot.session.finalPageCount}
                                    />
                                </div>
                            </section>

                            <section className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
                                <h3 className="mb-2 text-sm font-semibold text-ui-text">
                                    {t('support.dialog.outputSettings')}
                                </h3>
                                <SummaryRow
                                    label={t('support.dialog.optimizationPreset')}
                                    value={snapshot.session.optimizationPreset}
                                />
                                <SummaryRow
                                    label={t('support.dialog.imageFit')}
                                    value={snapshot.session.imageFit}
                                />
                                <SummaryRow
                                    label={t('support.dialog.targetDpi')}
                                    value={snapshot.session.targetDpi ?? t('support.off')}
                                />
                                <SummaryRow
                                    label={t('support.dialog.jpegQuality')}
                                    value={snapshot.session.jpegQuality ?? t('support.auto')}
                                />
                            </section>

                            <section className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
                                <h3 className="mb-3 text-sm font-semibold text-ui-text">
                                    {t('support.dialog.recentEvents')}
                                </h3>
                                {recentEvents.length ? (
                                    <div className="space-y-2">
                                        {recentEvents.map((entry) => (
                                            <div
                                                key={entry.id}
                                                className="rounded-lg border border-ui-border bg-ui-surface px-3 py-2"
                                            >
                                                <div className="flex items-center justify-between gap-3 text-xs">
                                                    <span className="font-semibold uppercase tracking-wide text-ui-text-muted">
                                                        {entry.severity} · {entry.category}
                                                    </span>
                                                    <span className="text-ui-text-muted">
                                                        {entry.timestamp}
                                                    </span>
                                                </div>
                                                <p className="mt-1 text-sm text-ui-text">
                                                    {entry.message}
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-ui-text-muted">
                                        {t('support.dialog.noEvents')}
                                    </p>
                                )}
                            </section>
                        </>
                    ) : (
                        <section className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
                            <h3 className="mb-2 text-sm font-semibold text-ui-text">
                                {t('support.dialog.aboutSection')}
                            </h3>
                            <p className="text-sm leading-6 text-ui-text-secondary">
                                {t('support.dialog.aboutCopy')}
                            </p>
                        </section>
                    )}

                    {actionState ? (
                        <p
                            className={[
                                'rounded-lg px-3 py-2 text-sm',
                                actionState.tone === 'success'
                                    ? 'bg-ui-accent-soft text-ui-accent-on-soft'
                                    : 'bg-ui-danger-soft text-ui-danger',
                            ].join(' ')}
                        >
                            {actionState.message}
                        </p>
                    ) : null}
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
