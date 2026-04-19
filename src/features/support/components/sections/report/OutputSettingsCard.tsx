import type { DiagnosticsSnapshot } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { PanelSurface } from '@/shared/ui';
import { SummaryRow } from '../SummaryRow';

export function SupportOutputSettingsCard({ snapshot }: { snapshot: DiagnosticsSnapshot }) {
    const { t } = useTranslation();

    return (
        <PanelSurface title={t('support.dialog.outputSettings')}>
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
        </PanelSurface>
    );
}
