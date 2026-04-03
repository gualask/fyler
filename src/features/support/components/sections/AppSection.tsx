import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { SummaryRow } from './SummaryRow';

export function SupportAppSection({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
    const { t } = useTranslation();

    return (
        <section className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
            <div className="mb-2 flex items-center justify-between gap-3">
                <h3 className="text-sm font-semibold text-ui-text">{snapshot.app.appName}</h3>
                <span className="rounded-full bg-ui-accent-soft px-2.5 py-1 text-xs font-semibold text-ui-accent-on-soft">
                    v{snapshot.app.version}
                </span>
            </div>
            <SummaryRow label={t('support.dialog.identifier')} value={snapshot.app.identifier} />
            <SummaryRow
                label={t('support.dialog.platform')}
                value={`${snapshot.app.platform} (${snapshot.app.arch})`}
            />
            <SummaryRow label={t('support.dialog.generatedAt')} value={snapshot.generatedAt} />
        </section>
    );
}
