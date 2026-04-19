import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { PanelSurface } from '@/shared/ui';
import { SummaryRow } from '../SummaryRow';
import { SupportOutputSettingsCard } from './OutputSettingsCard';
import { SupportRecentEventsCard } from './RecentEventsCard';

function SupportPreferencesCard({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
    const { t } = useTranslation();

    return (
        <PanelSurface as="div" title={t('support.dialog.preferences')}>
            <SummaryRow label={t('support.dialog.locale')} value={snapshot.preferences.locale} />
            <SummaryRow label={t('support.dialog.theme')} value={snapshot.preferences.theme} />
        </PanelSurface>
    );
}

function SupportSessionCard({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
    const { t } = useTranslation();

    return (
        <PanelSurface as="div" title={t('support.dialog.session')}>
            <SummaryRow
                label={t('support.dialog.quickAdd')}
                value={snapshot.session.quickAdd ? t('support.on') : t('support.off')}
            />
            <SummaryRow label={t('support.dialog.fileCount')} value={snapshot.session.fileCount} />
            <SummaryRow
                label={t('support.dialog.finalPageCount')}
                value={snapshot.session.finalPageCount}
            />
        </PanelSurface>
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
