import { type ReactNode, useCallback, useMemo, useRef } from 'react';
import { PdfCacheProvider } from '@/infrastructure/pdfjs';
import { useTranslation } from '@/shared/i18n';
import {
    type PageCompositionNotifications,
    useCompositionExit,
    useCompositionPreview,
    useOwnedComposition,
    usePageCompositionExport,
    usePageCompositionPort,
    usePageCompositionSourceAcquisition,
} from '../application';
import type { CompositionRegionKey, PageComposition } from '../model';
import { CompositionPasswordDialog, DiscardCompositionDialog } from './CompositionDialogs';
import { CompositionPreview } from './CompositionPreview';
import { CompositionSettingsPanel } from './CompositionSettingsPanel';
import { PageCompositionHeader } from './PageCompositionHeader';
import { PdfPagePicker } from './PdfPagePicker';

type PageCompositionWorkflowProps = {
    notifications: PageCompositionNotifications;
    onExit: () => void;
    renderSettingsMenu: () => ReactNode;
    renderAlwaysOnTopControl: () => ReactNode;
    renderProgressOverlay: () => ReactNode;
};

type WorkspaceProps = {
    composition: PageComposition;
    layout: Parameters<typeof CompositionPreview>[0]['layout'];
    regionRefs: Parameters<typeof CompositionPreview>[0]['regionRefs'];
    dragRegion: Parameters<typeof CompositionPreview>[0]['dragRegion'];
    busy: boolean;
    output: ReturnType<typeof usePageCompositionExport>;
    chooseSource: (region: CompositionRegionKey) => void | Promise<void>;
    commit: ReturnType<typeof useOwnedComposition>['commit'];
};

function useRegionFocus() {
    const top = useRef<HTMLButtonElement | null>(null);
    const bottom = useRef<HTMLButtonElement | null>(null);
    const regionRefs = useMemo(() => ({ top, bottom }), []);
    const focusRegion = useCallback((region: CompositionRegionKey) => {
        const ref = region === 'top' ? top : bottom;
        window.requestAnimationFrame(() => ref.current?.focus());
    }, []);
    return { regionRefs, focusRegion };
}

function CompositionWorkspace({
    composition,
    layout,
    regionRefs,
    dragRegion,
    busy,
    output,
    chooseSource,
    commit,
}: WorkspaceProps) {
    return (
        <div className="workspace-layout-frame flex">
            <div className="workspace-surface flex min-w-0 flex-1">
                <CompositionPreview
                    composition={composition}
                    layout={layout}
                    regionRefs={regionRefs}
                    onChoose={(region) => void chooseSource(region)}
                    onRotate={(region, direction) => commit({ type: 'rotate', region, direction })}
                    onRemove={(region) => commit({ type: 'remove', region })}
                    onSwap={() => commit({ type: 'swap' })}
                    disabled={busy}
                    dragRegion={dragRegion}
                />
            </div>
            <CompositionSettingsPanel
                layout={composition.layout}
                outputFormat={output.outputFormat}
                preset={output.preset}
                jpegQuality={output.jpegQuality}
                busy={busy}
                onLayoutChange={(layout) => commit({ type: 'layoutChanged', layout })}
                onOutputFormatChange={output.setOutputFormat}
                onPresetChange={output.setPreset}
                onJpegQualityChange={output.setJpegQuality}
            />
        </div>
    );
}

function WorkflowDialogs({
    picker,
    password,
    discardOpen,
    onCancelPicker,
    onConfirmPdfPage,
    onCancelPassword,
    onUnlockPdf,
    onCancelDiscard,
    onDiscard,
}: {
    picker: ReturnType<typeof usePageCompositionSourceAcquisition>['picker'];
    password: ReturnType<typeof usePageCompositionSourceAcquisition>['password'];
    discardOpen: boolean;
    onCancelPicker: () => void;
    onConfirmPdfPage: (pageNum: number) => Promise<void>;
    onCancelPassword: () => void;
    onUnlockPdf: (password: string) => Promise<boolean>;
    onCancelDiscard: () => void;
    onDiscard: () => void;
}) {
    return (
        <>
            {picker ? (
                <PdfPagePicker
                    file={picker.file}
                    onCancel={onCancelPicker}
                    onConfirm={onConfirmPdfPage}
                />
            ) : null}
            {password ? (
                <CompositionPasswordDialog
                    file={password.file}
                    onCancel={onCancelPassword}
                    onUnlock={onUnlockPdf}
                />
            ) : null}
            {discardOpen ? (
                <DiscardCompositionDialog onCancel={onCancelDiscard} onDiscard={onDiscard} />
            ) : null}
        </>
    );
}

function PageCompositionWorkflowContent({
    notifications,
    onExit,
    renderSettingsMenu,
    renderAlwaysOnTopControl,
    renderProgressOverlay,
}: PageCompositionWorkflowProps) {
    const { t } = useTranslation();
    const compositionPort = usePageCompositionPort();
    const showError = notifications.showError;
    const { composition, compositionRef, commit, releaseFiles, discardComposition } =
        useOwnedComposition();
    const output = usePageCompositionExport(compositionRef, notifications);
    const { layout, status, setStatus } = useCompositionPreview(
        composition,
        compositionPort,
        showError,
        {
            updating: t('pageComposition.previewUpdating'),
            ready: t('pageComposition.previewReady'),
            error: t('pageComposition.previewError'),
        },
    );
    const exit = useCompositionExit(compositionRef, discardComposition, onExit);
    const { regionRefs, focusRegion } = useRegionFocus();
    const {
        picker,
        password,
        dragRegion,
        chooseSource,
        cancelPicker,
        confirmPdfPage,
        unlockPdf,
        cancelPassword,
    } = usePageCompositionSourceAcquisition({
        notifications,
        compositionRef,
        regionRefs,
        commit,
        releaseFiles,
        focusRegion,
        setStatus,
        dropDisabled: exit.discardOpen,
    });
    return (
        <div
            className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text"
            aria-busy={notifications.isBusy}
        >
            <PageCompositionHeader
                composition={composition}
                outputFormat={output.outputFormat}
                busy={notifications.isBusy}
                renderSettingsMenu={renderSettingsMenu}
                renderAlwaysOnTopControl={renderAlwaysOnTopControl}
                onBack={exit.requestExit}
                onExport={() => void output.exportComposition()}
            />
            <CompositionWorkspace
                composition={composition}
                layout={layout}
                regionRefs={regionRefs}
                dragRegion={dragRegion}
                busy={notifications.isBusy}
                output={output}
                chooseSource={chooseSource}
                commit={commit}
            />
            <p className="sr-only" role="status" aria-live="polite">
                {status}
            </p>
            <WorkflowDialogs
                picker={picker}
                password={password}
                discardOpen={exit.discardOpen}
                onCancelPicker={cancelPicker}
                onConfirmPdfPage={confirmPdfPage}
                onCancelPassword={cancelPassword}
                onUnlockPdf={unlockPdf}
                onCancelDiscard={exit.closeDiscard}
                onDiscard={exit.discardAndExit}
            />
            {renderProgressOverlay()}
        </div>
    );
}

export function PageCompositionWorkflow(props: PageCompositionWorkflowProps) {
    return (
        <PdfCacheProvider>
            <PageCompositionWorkflowContent {...props} />
        </PdfCacheProvider>
    );
}
