import { IconDownload, IconEye, IconHelp } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { TUTORIAL_TARGETS, tutorialTargetProps } from '@/modules/merge/ui/tutorial';
import { useTranslation } from '@/shared/i18n';
import { WorkflowHeader } from '@/shared/ui';
import { ActionTooltip } from '@/shared/ui/feedback/tooltip';

interface Props {
    renderSettingsMenu: (onReportBug: () => void) => ReactNode;
    onReportBug: () => void;
    onPreview: () => void;
    canPreview: boolean;
    renderAlwaysOnTopControl: () => ReactNode;
    onHelp: () => void;
    canHelp: boolean;
    onExport: () => void;
    canExport: boolean;
    onExit: () => void;
}

export function AppHeader({
    renderSettingsMenu,
    onReportBug,
    onPreview,
    canPreview,
    renderAlwaysOnTopControl,
    onHelp,
    canHelp,
    onExport,
    canExport,
    onExit,
}: Props) {
    const { t } = useTranslation();

    return (
        <WorkflowHeader
            title={t('taskHome.merge.title')}
            onBack={onExit}
            utilityActions={
                <ActionTooltip
                    label={t('header.openGuide')}
                    renderTrigger={({ ariaDescribedBy, onFocus, onBlur }) => (
                        <button
                            type="button"
                            disabled={!canHelp}
                            onClick={onHelp}
                            className="btn-icon"
                            aria-label={t('header.openGuide')}
                            aria-describedby={ariaDescribedBy}
                            onFocus={onFocus}
                            onBlur={onBlur}
                        >
                            <IconHelp className="h-5 w-5" aria-hidden="true" />
                        </button>
                    )}
                />
            }
            settingsControl={renderSettingsMenu(onReportBug)}
            primaryActions={
                <>
                    <div {...tutorialTargetProps(TUTORIAL_TARGETS.alwaysOnTop)}>
                        {renderAlwaysOnTopControl()}
                    </div>
                    <div
                        {...tutorialTargetProps(TUTORIAL_TARGETS.export)}
                        className="flex items-center gap-2"
                    >
                        <ActionTooltip
                            label={t('header.previewPdf')}
                            renderTrigger={({ ariaDescribedBy, onFocus, onBlur }) => (
                                <button
                                    type="button"
                                    disabled={!canPreview}
                                    onClick={onPreview}
                                    className="btn-icon"
                                    aria-label={t('header.previewPdf')}
                                    aria-describedby={ariaDescribedBy}
                                    onFocus={onFocus}
                                    onBlur={onBlur}
                                >
                                    <IconEye className="h-5 w-5" aria-hidden="true" />
                                </button>
                            )}
                        />
                        <button
                            type="button"
                            disabled={!canExport}
                            onClick={onExport}
                            className="btn-primary btn-toolbar"
                        >
                            <IconDownload className="h-5 w-5" aria-hidden="true" />
                            {t('header.exportPdf')}
                        </button>
                    </div>
                </>
            }
        />
    );
}
