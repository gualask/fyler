import { IconDownload } from '@tabler/icons-react';
import type { ReactNode } from 'react';

import { useTranslation } from '@/shared/i18n';
import { WorkflowHeader } from '@/shared/ui';
import { type CompositionOutputFormat, canExportComposition, type PageComposition } from '../model';

export function PageCompositionHeader({
    composition,
    outputFormat,
    busy,
    renderSettingsMenu,
    renderAlwaysOnTopControl,
    onBack,
    onExport,
}: {
    composition: PageComposition;
    outputFormat: CompositionOutputFormat;
    busy: boolean;
    renderSettingsMenu: () => ReactNode;
    renderAlwaysOnTopControl: () => ReactNode;
    onBack: () => void;
    onExport: () => void;
}) {
    const { t } = useTranslation();

    return (
        <WorkflowHeader
            title={t('taskHome.composition.title')}
            backDisabled={busy}
            onBack={onBack}
            settingsControl={renderSettingsMenu()}
            primaryActions={
                <>
                    {renderAlwaysOnTopControl()}
                    <button
                        type="button"
                        className="btn-primary btn-toolbar"
                        disabled={!canExportComposition(composition) || busy}
                        onClick={onExport}
                    >
                        <IconDownload className="h-5 w-5" aria-hidden="true" />
                        <span className="hidden sm:inline">
                            {t(
                                outputFormat === 'pdf'
                                    ? 'pageComposition.exportPdf'
                                    : 'pageComposition.exportJpeg',
                            )}
                        </span>
                    </button>
                </>
            }
        />
    );
}
