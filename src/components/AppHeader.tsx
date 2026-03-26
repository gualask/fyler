import { IconArrowsMinimize, IconDownload, IconEye, IconHelp } from '@tabler/icons-react';
import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/components/tutorial';
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
    canHelp: boolean;
}

export function AppHeader({
    settings,
    onExport,
    canExport,
    onPreview,
    canPreview,
    onQuickAdd,
    onHelp,
    canHelp,
}: Props) {
    const { t } = useTranslation();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <img src="/icon.svg" alt="Fyler" className="h-6 w-6" />
                    <span className="text-base font-bold bg-gradient-to-r from-[#05BAFF] to-[#505FFF] bg-clip-text text-transparent">
                        Fyler
                    </span>
                </div>
                <div className="mx-1 h-5 w-px bg-ui-border" />
                <div className="flex items-center gap-2">
                    <AppSettingsMenu {...settings} />
                    <button
                        type="button"
                        onClick={onQuickAdd}
                        className="btn-ghost btn-toolbar"
                        title={t('header.quickAdd')}
                    >
                        <IconArrowsMinimize className="h-4 w-4" />
                        {t('header.quickAdd')}
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <button
                    type="button"
                    disabled={!canHelp}
                    onClick={onHelp}
                    className="btn-ghost btn-toolbar"
                >
                    <IconHelp className="h-4 w-4" />
                    {t('header.help')}
                </button>
                <button
                    type="button"
                    disabled={!canPreview}
                    onClick={onPreview}
                    className="btn-ghost btn-toolbar"
                >
                    <IconEye className="h-4 w-4" />
                    {t('header.preview')}
                </button>
                <button
                    type="button"
                    {...tutorialTargetProps(TUTORIAL_TARGETS.export)}
                    disabled={!canExport}
                    onClick={onExport}
                    className="btn-primary btn-toolbar"
                >
                    <IconDownload className="h-5 w-5" />
                    {t('header.exportPdf')}
                </button>
            </div>
        </header>
    );
}
