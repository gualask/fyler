import { IconArrowsMinimize, IconDownload, IconEye, IconHelp } from '@tabler/icons-react';
import { useTranslation } from '@/i18n';
import { AppSettingsMenu, type AppSettingsMenuProps } from './AppSettingsMenu';

interface Props {
    settings: AppSettingsMenuProps;
    onExport: () => void;
    canExport: boolean;
    onPreview: () => void;
    canPreview: boolean;
    onQuickAdd: () => void;
    onHelp: () => void;
}

export function AppHeader({
    settings,
    onExport,
    canExport,
    onPreview,
    canPreview,
    onQuickAdd,
    onHelp,
}: Props) {
    const { t } = useTranslation();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <img src="/icon.svg" alt="Fyler" className="h-6 w-6" />
                    <span className="text-base font-bold bg-gradient-to-r from-[#05BAFF] to-[#505FFF] bg-clip-text text-transparent">Fyler</span>
                </div>
                <div className="mx-1 h-5 w-px bg-ui-border" />
                <div className="flex items-center gap-2">
                    <AppSettingsMenu {...settings} />
                    <button onClick={onQuickAdd} className="btn-ghost" title={t('header.quickAdd')}>
                        <IconArrowsMinimize className="h-4 w-4" />
                        {t('header.quickAdd')}
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button onClick={onHelp} className="btn-ghost">
                    <IconHelp className="h-4 w-4" />
                    {t('header.help')}
                </button>
                <button
                    disabled={!canPreview}
                    onClick={onPreview}
                    className="btn-ghost"
                >
                    <IconEye className="h-4 w-4" />
                    {t('header.preview')}
                </button>
                <button
                    disabled={!canExport}
                    onClick={onExport}
                    className="btn-primary"
                >
                    <IconDownload className="h-5 w-5" />
                    {t('header.exportPdf')}
                </button>
            </div>
        </header>
    );
}
