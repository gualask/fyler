import { useTranslation } from '../i18n';
import { SUPPORTED_LOCALES } from '../locale';

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useTranslation();

    return (
        <div
            className="language-switcher"
            aria-label={t('language.switcherLabel')}
            role="group"
        >
            {SUPPORTED_LOCALES.map((option) => (
                <button
                    key={option}
                    type="button"
                    aria-pressed={locale === option}
                    title={t(`language.switchTo.${option}`)}
                    onClick={() => setLocale(option)}
                    className={[
                        'language-switcher__option',
                        locale === option
                            ? 'language-switcher__option-active'
                            : 'language-switcher__option-inactive',
                    ].join(' ')}
                >
                    {t(`language.short.${option}`)}
                </button>
            ))}
        </div>
    );
}
