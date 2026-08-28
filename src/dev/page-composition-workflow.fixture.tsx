import { useCallback, useReducer, useRef, useState } from 'react';

import {
    useCompositionPreview,
    usePageCompositionPort,
} from '@/modules/page-composition/application';
import {
    type CompositionCompressionPreset,
    type CompositionJpegQuality,
    type CompositionOutputFormat,
    type CompositionRegionKey,
    pageCompositionReducer,
} from '@/modules/page-composition/model';
import { CompositionPreview } from '@/modules/page-composition/ui/CompositionPreview';
import { CompositionSettingsPanel } from '@/modules/page-composition/ui/CompositionSettingsPanel';
import { PageCompositionHeader } from '@/modules/page-composition/ui/PageCompositionHeader';
import { useFixtureWorkflowControls } from './fixture-workflow-controls';
import {
    BACK_FILE,
    FRONT_FILE,
    initialComposition,
} from './page-composition-workflow.fixture-data';

export function PageCompositionWorkflowFixturePage() {
    const controls = useFixtureWorkflowControls();
    const compositionPort = usePageCompositionPort();
    const [composition, dispatch] = useReducer(
        pageCompositionReducer,
        window.location.search,
        initialComposition,
    );
    const [outputFormat, setOutputFormat] = useState<CompositionOutputFormat>('pdf');
    const [preset, setPreset] = useState<CompositionCompressionPreset>('light');
    const [jpegQuality, setJpegQuality] = useState<CompositionJpegQuality>(92);
    const topRef = useRef<HTMLButtonElement | null>(null);
    const bottomRef = useRef<HTMLButtonElement | null>(null);
    const showError = useCallback(
        () => controls.recordAction('preview-layout-error'),
        [controls.recordAction],
    );
    const { layout } = useCompositionPreview(composition, compositionPort, showError, {
        updating: 'fixture-preview-updating',
        ready: 'fixture-preview-ready',
        error: 'fixture-preview-error',
    });
    const regionRefs = { top: topRef, bottom: bottomRef };

    const chooseSource = (region: CompositionRegionKey) => {
        dispatch({
            type: 'assign',
            region,
            source: { kind: 'image', file: region === 'top' ? FRONT_FILE : BACK_FILE },
        });
        controls.recordAction(`${region}-source-restored`);
    };

    return (
        <main
            className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text"
            data-fixture-scenario="page-composition"
            data-fixture-last-action={controls.lastAction || undefined}
        >
            <PageCompositionHeader
                composition={composition}
                outputFormat={outputFormat}
                busy={false}
                renderSettingsMenu={controls.renderSettingsMenu}
                renderAlwaysOnTopControl={controls.renderAlwaysOnTopControl}
                onBack={controls.backToIndex}
                onExport={() => controls.recordAction(`export-${outputFormat}-requested`)}
            />
            <div className="workspace-layout-frame flex">
                <div className="workspace-surface flex min-w-0 flex-1">
                    <CompositionPreview
                        composition={composition}
                        layout={layout}
                        regionRefs={regionRefs}
                        onChoose={chooseSource}
                        onRotate={(region, direction) => {
                            dispatch({ type: 'rotate', region, direction });
                            controls.recordAction(`${region}-rotated-${direction}`);
                        }}
                        onRemove={(region) => {
                            dispatch({ type: 'remove', region });
                            controls.recordAction(`${region}-removed`);
                        }}
                        onSwap={() => {
                            dispatch({ type: 'swap' });
                            controls.recordAction('front-back-swapped');
                        }}
                        disabled={false}
                        dragRegion={null}
                    />
                </div>
                <CompositionSettingsPanel
                    layout={composition.layout}
                    outputFormat={outputFormat}
                    preset={preset}
                    jpegQuality={jpegQuality}
                    busy={false}
                    onLayoutChange={(nextLayout) => {
                        dispatch({ type: 'layoutChanged', layout: nextLayout });
                        controls.recordAction(`layout-${nextLayout}`);
                    }}
                    onOutputFormatChange={(format) => {
                        setOutputFormat(format);
                        controls.recordAction(`format-${format}`);
                    }}
                    onPresetChange={(nextPreset) => {
                        setPreset(nextPreset);
                        controls.recordAction(`preset-${nextPreset}`);
                    }}
                    onJpegQualityChange={(quality) => {
                        setJpegQuality(quality);
                        controls.recordAction(`jpeg-quality-${quality}`);
                    }}
                />
            </div>
            <p className="sr-only" role="status" aria-live="polite">
                {controls.lastAction}
            </p>
        </main>
    );
}
