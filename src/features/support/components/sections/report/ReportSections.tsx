import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { SummaryRow } from '../SummaryRow';
import { SupportOutputSettingsCard } from './OutputSettingsCard';
import { SupportRecentEventsCard } from './RecentEventsCard';

function SupportPreferencesCard({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-ui-text">
                {t('support.dialog.preferences')}
            </h3>
            <SummaryRow label={t('support.dialog.locale')} value={snapshot.preferences.locale} />
            <SummaryRow label={t('support.dialog.theme')} value={snapshot.preferences.theme} />
        </div>
    );
}

function SupportSessionCard({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
    const { t } = useTranslation();

    return (
        <div className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-ui-text">
                {t('support.dialog.session')}
            </h3>
            <SummaryRow
                label={t('support.dialog.quickAdd')}
                value={snapshot.session.quickAdd ? t('support.on') : t('support.off')}
            />
            <SummaryRow label={t('support.dialog.fileCount')} value={snapshot.session.fileCount} />
            <SummaryRow
                label={t('support.dialog.finalPageCount')}
                value={snapshot.session.finalPageCount}
            />
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
    return (
        <>
            <section className="grid gap-4 md:grid-cols-2">
                <SupportPreferencesCard snapshot={snapshot} />
                <SupportSessionCard snapshot={snapshot} />
            </section>

            <SupportOutputSettingsCard snapshot={snapshot} />
            <SupportRecentEventsCard recentEvents={recentEvents} />
        </>
    );
}
