import { IconChevronDown } from '@tabler/icons-react';
import { useRef, useState } from 'react';
import { useTranslation } from '../i18n';
import { useDismissableMenu } from '../hooks/useDismissableMenu';
import { SUPPORTED_LOCALES } from '../locale';

export function LanguageSwitcher() {
    const { locale, setLocale, t } = useTranslation();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement | null>(null);
    useDismissableMenu({ open, rootRef, onClose: () => setOpen(false) });

    function handleToggle() {
        setOpen((current) => !current);
    }

    function handleSelect(nextLocale: (typeof SUPPORTED_LOCALES)[number]) {
        setLocale(nextLocale);
        setOpen(false);
    }

    return (
        <div
            ref={rootRef}
            className="language-switcher"
        >
            <button
                type="button"
                className="language-switcher__trigger"
                aria-label={t('language.switcherLabel')}
                aria-haspopup="menu"
                aria-expanded={open}
                title={t('language.switcherLabel')}
                onClick={handleToggle}
            >
                <span>{t(`language.short.${locale}`)}</span>
                <IconChevronDown
                    className={['language-switcher__chevron', open ? 'language-switcher__chevron-open' : ''].join(' ')}
                />
            </button>
            {open ? (
                <div className="language-switcher__menu" role="menu" aria-label={t('language.switcherLabel')}>
                    {SUPPORTED_LOCALES.map((option) => (
                        <button
                            key={option}
                            type="button"
                            role="menuitemradio"
                            aria-checked={locale === option}
                            title={t(`language.switchTo.${option}`)}
                            onClick={() => handleSelect(option)}
                            className={[
                                'language-switcher__menu-option',
                                locale === option
                                    ? 'language-switcher__menu-option-active'
                                    : 'language-switcher__menu-option-inactive',
                            ].join(' ')}
                        >
                            <span className="language-switcher__menu-label">{t(`language.name.${option}`)}</span>
                            <span className="language-switcher__menu-short">{t(`language.short.${option}`)}</span>
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}
