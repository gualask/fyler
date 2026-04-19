import type { ReactNode } from 'react';
import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { getDiagnosticMetadataEntries } from '@/shared/diagnostics/diagnostics.metadata';
import { useTranslation } from '@/shared/i18n';
import { SummaryRow } from '../SummaryRow';

function SupportDetailsGroup({ title, children }: { title: string; children: ReactNode }) {
    return (
        <section className="space-y-1.5">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ui-text-muted">
                {title}
            </h3>
            <dl className="divide-y divide-ui-border/70">{children}</dl>
        </section>
    );
}

function SupportRecentEventsList({
    recentEvents,
}: {
    recentEvents: DiagnosticsSnapshot['recentEvents'];
}) {
    const { t } = useTranslation();

    if (!recentEvents.length) {
        return <p className="text-sm text-ui-text-muted">{t('support.dialog.noEvents')}</p>;
    }

    return (
        <div className="divide-y divide-ui-border/70 rounded-lg border border-ui-border/60 bg-ui-bg/15 px-3">
            {recentEvents.map((entry) => {
                const metadataEntries = getDiagnosticMetadataEntries(entry.metadata);
                const metadataText = metadataEntries
                    .map(([key, value]) => `${key}=${value}`)
                    .join(' · ');

                return (
                    <div key={entry.id} className="space-y-1.5 py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px]">
                            <span className="font-medium uppercase tracking-[0.06em] text-ui-text-muted">
                                {entry.severity} · {entry.category}
                            </span>
                            <span className="text-ui-text-muted">{entry.timestamp}</span>
                        </div>
                        <p className="text-sm leading-5 text-ui-text">{entry.message}</p>
                        {metadataText ? (
                            <p className="text-[11px] text-ui-text-muted [overflow-wrap:anywhere] font-mono">
                                {metadataText}
                            </p>
                        ) : null}
                    </div>
                );
            })}
        </div>
    );
}

export function SupportReportSections({
    snapshot,
    recentEvents,
}: {
    snapshot: DiagnosticsSnapshot;
    recentEvents: DiagnosticsSnapshot['recentEvents'];
}) {
    const { t } = useTranslation();

    return (
        <div className="space-y-4">
            <section className="grid gap-x-6 gap-y-4 md:grid-cols-2">
                <SupportDetailsGroup title={t('support.dialog.appDetails')}>
                    <SummaryRow
                        label={t('support.dialog.platform')}
                        value={`${snapshot.app.platform} (${snapshot.app.arch})`}
                        wrapValue
                    />
                    <SummaryRow
                        label={t('support.dialog.identifier')}
                        value={snapshot.app.identifier}
                        wrapValue
                    />
                    <SummaryRow
                        label={t('support.dialog.generatedAt')}
                        value={snapshot.generatedAt}
                        wrapValue
                    />
                </SupportDetailsGroup>

                <SupportDetailsGroup title={t('support.dialog.session')}>
                    <SummaryRow
                        label={t('support.dialog.quickAdd')}
                        value={snapshot.session.quickAdd ? t('support.on') : t('support.off')}
                    />
                    <SummaryRow
                        label={t('support.dialog.fileCount')}
                        value={snapshot.session.fileCount}
                    />
                    <SummaryRow
                        label={t('support.dialog.finalPageCount')}
                        value={snapshot.session.finalPageCount}
                    />
                </SupportDetailsGroup>

                <SupportDetailsGroup title={t('support.dialog.preferences')}>
                    <SummaryRow
                        label={t('support.dialog.locale')}
                        value={snapshot.preferences.locale}
                    />
                    <SummaryRow
                        label={t('support.dialog.theme')}
                        value={snapshot.preferences.theme}
                    />
                </SupportDetailsGroup>

                <SupportDetailsGroup title={t('support.dialog.outputSettings')}>
                    <SummaryRow
                        label={t('support.dialog.optimizationPreset')}
                        value={snapshot.session.optimizationPreset}
                        wrapValue
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
                </SupportDetailsGroup>
            </section>

            <section className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.06em] text-ui-text-muted">
                        {t('support.dialog.recentEvents')}
                    </h3>
                    <span className="text-xs text-ui-text-muted">{recentEvents.length}</span>
                </div>
                <SupportRecentEventsList recentEvents={recentEvents} />
            </section>
        </div>
    );
}
