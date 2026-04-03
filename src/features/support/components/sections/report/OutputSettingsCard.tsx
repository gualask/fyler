import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { SummaryRow } from '../SummaryRow';

export function SupportOutputSettingsCard({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
    const { t } = useTranslation();

    return (
        <section className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-ui-text">
                {t('support.dialog.outputSettings')}
            </h3>
            <SummaryRow
                label={t('support.dialog.optimizationPreset')}
                value={snapshot.session.optimizationPreset}
            />
            <SummaryRow label={t('support.dialog.imageFit')} value={snapshot.session.imageFit} />
            <SummaryRow
                label={t('support.dialog.targetDpi')}
                value={snapshot.session.targetDpi ?? t('support.off')}
            />
            <SummaryRow
                label={t('support.dialog.jpegQuality')}
                value={snapshot.session.jpegQuality ?? t('support.auto')}
            />
        </section>
    );
}
