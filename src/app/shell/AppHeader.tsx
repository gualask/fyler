import { IconBolt, IconDownload, IconEye, IconHelp } from '@tabler/icons-react';
import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/features/tutorial';
import { useTranslation } from '@/shared/i18n';
import { AppSettingsMenu, type AppSettingsMenuProps } from './settings-menu/AppSettingsMenu';

interface Props {
    settings: AppSettingsMenuProps;
    onPreview: () => void;
    canPreview: boolean;
    onQuickAdd: () => void;
    onHelp: () => void;
    canHelp: boolean;
    onExport: () => void;
    canExport: boolean;
}

export function AppHeader({
    settings,
    onPreview,
    canPreview,
    onQuickAdd,
    onHelp,
    canHelp,
    onExport,
    canExport,
}: Props) {
    const { t } = useTranslation();

    return (
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-ui-border bg-ui-surface px-6">
            <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                    <img src="/icon.svg" alt="Fyler" className="h-6 w-6" />
                    <span className="text-base font-bold text-ui-text">Fyler</span>
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
                        <IconBolt className="h-4 w-4" />
                        {t('header.quickAdd')}
                    </button>
                </div>
            </div>
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    disabled={!canHelp}
                    onClick={onHelp}
                    className="btn-icon"
                    aria-label={t('header.help')}
                    title={t('header.help')}
                >
                    <IconHelp className="h-5 w-5" />
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
