import { useTranslation } from '@/shared/i18n';

export function SupportAboutSection() {
    const { t } = useTranslation();

    return (
        <section className="rounded-xl border border-ui-border bg-ui-bg/60 p-4">
            <h3 className="mb-2 text-sm font-semibold text-ui-text">
                {t('support.dialog.aboutSection')}
            </h3>
            <p className="text-sm leading-6 text-ui-text-secondary">
                {t('support.dialog.aboutCopy')}
            </p>
        </section>
    );
}
