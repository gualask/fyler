import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { getDiagnosticMetadataEntries } from '@/shared/diagnostics/diagnostics.metadata';
import { useTranslation } from '@/shared/i18n';
import { PanelSurface } from '@/shared/ui';

export function SupportRecentEventsCard({
    recentEvents,
}: {
    recentEvents: DiagnosticsSnapshot['recentEvents'];
}) {
    const { t } = useTranslation();

    return (
        <PanelSurface title={t('support.dialog.recentEvents')}>
            {recentEvents.length ? (
                <div className="space-y-2">
                    {recentEvents.map((entry) => {
                        const metadataEntries = getDiagnosticMetadataEntries(entry.metadata);

                        return (
                            <div
                                key={entry.id}
                                className="rounded-lg border border-ui-border bg-ui-surface px-3 py-2"
                            >
                                <div className="flex items-center justify-between gap-3 text-xs">
                                    <span className="font-semibold uppercase tracking-wide text-ui-text-muted">
                                        {entry.severity} · {entry.category}
                                    </span>
                                    <span className="text-ui-text-muted">{entry.timestamp}</span>
                                </div>
                                <p className="mt-1 text-sm text-ui-text">{entry.message}</p>
                                {metadataEntries.length ? (
                                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-ui-text-muted">
                                        {metadataEntries.map(([key, value]) => (
                                            <span
                                                key={`${entry.id}-${key}`}
                                                className="rounded-md bg-ui-bg px-2 py-1 font-mono"
                                            >
                                                {key}={value}
                                            </span>
                                        ))}
                                    </div>
                                ) : null}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <p className="text-sm text-ui-text-muted">{t('support.dialog.noEvents')}</p>
            )}
        </PanelSurface>
    );
}
