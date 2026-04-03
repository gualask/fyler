import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';

export function SupportRecentEventsCard({
    recentEvents,
}: {
    recentEvents: DiagnosticsSnapshot['recentEvents'];
}) {
    const { t } = useTranslation();

    return (
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
                                <span className="text-ui-text-muted">{entry.timestamp}</span>
                            </div>
                            <p className="mt-1 text-sm text-ui-text">{entry.message}</p>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-sm text-ui-text-muted">{t('support.dialog.noEvents')}</p>
            )}
        </section>
    );
}
