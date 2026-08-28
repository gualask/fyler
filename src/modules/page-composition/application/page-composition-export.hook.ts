import { type RefObject, useCallback, useState } from 'react';

import { useTranslation } from '@/shared/i18n';
import {
    type CompositionCompressionPreset,
    type CompositionJpegQuality,
    type CompositionOutputFormat,
    canExportComposition,
    type PageComposition,
    toExportRequest,
} from '../model';
import type { PageCompositionNotifications } from './page-composition.port';
import { type PageCompositionPort, usePageCompositionPort } from './page-composition.port';

type ExportSettings = {
    outputFormat: CompositionOutputFormat;
    preset: CompositionCompressionPreset;
    jpegQuality: CompositionJpegQuality;
};

async function runPageCompositionExport({
    composition,
    settings,
    compositionPort,
    notifications,
    t,
}: {
    composition: PageComposition;
    settings: ExportSettings;
    compositionPort: PageCompositionPort;
    notifications: PageCompositionNotifications;
    t: ReturnType<typeof useTranslation>['t'];
}) {
    if (!canExportComposition(composition)) return;
    let exportStarted = false;
    try {
        const isPdf = settings.outputFormat === 'pdf';
        const outputPath = await compositionPort.selectOutput(
            t(isPdf ? 'pageComposition.defaultFilenamePdf' : 'pageComposition.defaultFilenameJpeg'),
            t(isPdf ? 'dialogs.filters.pdf' : 'dialogs.filters.jpeg'),
            isPdf ? 'pdf' : 'jpg',
        );
        if (!outputPath || !notifications.beginPageComposition()) return;
        exportStarted = true;
        await compositionPort.exportComposition(
            toExportRequest(
                composition,
                outputPath,
                settings.outputFormat,
                settings.preset,
                settings.jpegQuality,
            ),
        );
        notifications.showExportCompleted();
    } catch (error) {
        notifications.showError(error);
    } finally {
        if (exportStarted) notifications.finishPageComposition();
    }
}

export function usePageCompositionExport(
    compositionRef: RefObject<PageComposition>,
    notifications: PageCompositionNotifications,
) {
    const { t } = useTranslation();
    const compositionPort = usePageCompositionPort();
    const [preset, setPreset] = useState<CompositionCompressionPreset>('light');
    const [jpegQuality, setJpegQuality] = useState<CompositionJpegQuality>(92);
    const [outputFormat, setOutputFormat] = useState<CompositionOutputFormat>('pdf');

    const exportComposition = useCallback(
        () =>
            runPageCompositionExport({
                composition: compositionRef.current,
                settings: { outputFormat, preset, jpegQuality },
                compositionPort,
                notifications,
                t,
            }),
        [compositionPort, compositionRef, jpegQuality, notifications, outputFormat, preset, t],
    );

    return {
        outputFormat,
        setOutputFormat,
        preset,
        setPreset,
        jpegQuality,
        setJpegQuality,
        exportComposition,
    };
}
