import { useTranslation } from '@/shared/i18n';
import { PanelSurface } from '@/shared/ui';

export function SupportAboutSection() {
    const { t } = useTranslation();

    return (
        <PanelSurface title={t('support.dialog.aboutSection')}>
            <p className="text-sm leading-6 text-ui-text-secondary">
                {t('support.dialog.aboutCopy')}
            </p>
        </PanelSurface>
    );
}
