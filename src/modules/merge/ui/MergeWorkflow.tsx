import { type ReactNode, useEffect, useState } from 'react';
import { PdfCacheProvider } from '@/infrastructure/pdfjs';
import { useAddFilesAction, useExportAction, useWorkspace } from '@/modules/merge/application';
import { useOptimize, WorkspaceStoreProvider } from '@/modules/merge/model';
import type { MergeDiagnosticsSnapshot } from '@/shared/contracts/merge-diagnostics';
import type { MergeNotificationsApi } from '../application/notifications.port';
import { MergeExitDialog } from './MergeExitDialog';
import { MergeWorkflowOverlays } from './MergeWorkflowOverlays';
import { useTutorial, useTutorialFilesAddedHandler } from './tutorial';
import { ProtectedPdfPasswordDialog } from './workspace';
import { MainAppView } from './workspace/MainAppView';

type MergeWorkflowSettings = {
    renderSettingsMenu: (onReportBug: () => void) => ReactNode;
};

type MergeWorkflowContentProps = {
    notifications: MergeNotificationsApi;
    settings: MergeWorkflowSettings;
    onReportBug: () => void;
    onDiagnosticsChange?: (snapshot: MergeDiagnosticsSnapshot) => void;
    renderAlwaysOnTopControl: () => ReactNode;
    renderProgressOverlay: () => ReactNode;
    onExit: () => void;
};

type WorkspaceState = ReturnType<typeof useWorkspace>;
type TutorialState = ReturnType<typeof useTutorial>;
type OptimizeState = ReturnType<typeof useOptimize>;

export type MergeWorkflowRuntime = {
    workspace: WorkspaceState;
    tutorial: TutorialState;
    optimize: OptimizeState;
    isBusy: boolean;
    handleAddFiles: ReturnType<typeof useAddFilesAction>;
    exportMerged: ReturnType<typeof useExportAction>;
};

function isTutorialReadyForAutoStart(runtime: MergeWorkflowRuntime): boolean {
    return (
        runtime.workspace.files.length > 0 &&
        runtime.workspace.selectedFile !== null &&
        runtime.workspace.finalPages.length > 0
    );
}

function useMergeWorkflowRuntime(notifications: MergeNotificationsApi): MergeWorkflowRuntime {
    const isBusy = notifications.isBusy;
    const tutorial = useTutorial();
    const onFilesAdded = useTutorialFilesAddedHandler({ tutorial });
    const workspace = useWorkspace({
        onFilesAdded,
        onDropError: notifications.showError,
        onDropImportStart: notifications.beginOpeningFiles,
        onDropImportReady: notifications.finishOpeningFiles,
    });
    const optimize = useOptimize();

    const exportMerged = useExportAction({
        finalPages: workspace.finalPages,
        editsByFile: workspace.editsByFile,
        notifications,
        optimize,
    });
    const handleAddFiles = useAddFilesAction({ workspace, notifications });

    return {
        workspace,
        tutorial,
        optimize,
        isBusy,
        handleAddFiles,
        exportMerged,
    };
}

export function MergeWorkflow({
    notifications,
    settings,
    onReportBug,
    onDiagnosticsChange,
    renderAlwaysOnTopControl,
    renderProgressOverlay,
    onExit,
}: MergeWorkflowContentProps) {
    return (
        <PdfCacheProvider>
            <MergeWorkflowContent
                notifications={notifications}
                settings={settings}
                onReportBug={onReportBug}
                onDiagnosticsChange={onDiagnosticsChange}
                renderAlwaysOnTopControl={renderAlwaysOnTopControl}
                renderProgressOverlay={renderProgressOverlay}
                onExit={onExit}
            />
        </PdfCacheProvider>
    );
}

function useMergeExit(workspace: WorkspaceState, onExit: () => void) {
    const [showExitConfirmation, setShowExitConfirmation] = useState(false);

    const requestExit = () => {
        if (workspace.files.length > 0) setShowExitConfirmation(true);
        else onExit();
    };

    const discardAndExit = () => {
        workspace.clearAllFiles();
        setShowExitConfirmation(false);
        onExit();
    };

    return {
        showExitConfirmation,
        requestExit,
        discardAndExit,
        cancelExit: () => setShowExitConfirmation(false),
    };
}

function useMergeDiagnostics(
    runtime: MergeWorkflowRuntime,
    onDiagnosticsChange?: (snapshot: MergeDiagnosticsSnapshot) => void,
) {
    useEffect(() => {
        onDiagnosticsChange?.({
            fileCount: runtime.workspace.files.length,
            finalPageCount: runtime.workspace.finalPages.length,
            optimizationPreset: runtime.optimize.optimizationPreset,
            imageFit: runtime.optimize.imageFit,
            targetDpi: runtime.optimize.targetDpi,
            jpegQuality: runtime.optimize.jpegQuality,
        });
    }, [
        onDiagnosticsChange,
        runtime.optimize.imageFit,
        runtime.optimize.jpegQuality,
        runtime.optimize.optimizationPreset,
        runtime.optimize.targetDpi,
        runtime.workspace.files.length,
        runtime.workspace.finalPages.length,
    ]);
}

function MergeWorkflowWorkspace({
    runtime,
    settings,
    onReportBug,
    renderAlwaysOnTopControl,
    renderProgressOverlay,
    showFinalPreview,
    setShowFinalPreview,
    onExit,
}: Omit<MergeWorkflowContentProps, 'notifications' | 'onDiagnosticsChange'> & {
    runtime: MergeWorkflowRuntime;
    showFinalPreview: boolean;
    setShowFinalPreview: (show: boolean) => void;
}) {
    return (
        <>
            <MainAppView
                renderSettingsMenu={settings.renderSettingsMenu}
                renderAlwaysOnTopControl={renderAlwaysOnTopControl}
                openReportBug={onReportBug}
                canPreview={!runtime.isBusy && runtime.workspace.finalPages.length > 0}
                tutorialStart={runtime.tutorial.start}
                canHelp={!runtime.isBusy && runtime.workspace.files.length > 0}
                exportMerged={runtime.exportMerged}
                canExport={!runtime.isBusy && runtime.workspace.finalPages.length > 0}
                isDragOver={runtime.workspace.isDragOver}
                workspace={runtime.workspace}
                handleAddFiles={runtime.handleAddFiles}
                optimize={runtime.optimize}
                setShowFinalPreview={setShowFinalPreview}
                onExit={onExit}
            />
            <MergeWorkflowOverlays
                runtime={runtime}
                renderProgressOverlay={renderProgressOverlay}
                showFinalPreview={showFinalPreview}
                setShowFinalPreview={setShowFinalPreview}
            />
        </>
    );
}

function MergeWorkflowContent({
    notifications,
    settings,
    onReportBug,
    onDiagnosticsChange,
    renderAlwaysOnTopControl,
    renderProgressOverlay,
    onExit,
}: MergeWorkflowContentProps) {
    const runtime = useMergeWorkflowRuntime(notifications);
    const isTutorialReady = isTutorialReadyForAutoStart(runtime);
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const exit = useMergeExit(runtime.workspace, onExit);

    useEffect(() => {
        runtime.tutorial.maybeAutoStart(isTutorialReady);
    }, [isTutorialReady, runtime.tutorial.maybeAutoStart]);

    useMergeDiagnostics(runtime, onDiagnosticsChange);

    return (
        <WorkspaceStoreProvider store={runtime.workspace.store}>
            <main
                className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text"
                aria-busy={runtime.isBusy}
            >
                <MergeWorkflowWorkspace
                    runtime={runtime}
                    settings={settings}
                    onReportBug={onReportBug}
                    renderAlwaysOnTopControl={renderAlwaysOnTopControl}
                    renderProgressOverlay={renderProgressOverlay}
                    showFinalPreview={showFinalPreview}
                    setShowFinalPreview={setShowFinalPreview}
                    onExit={exit.requestExit}
                />
                <ProtectedPdfPasswordDialog state={runtime.workspace.passwordDialog} />
                {exit.showExitConfirmation ? (
                    <MergeExitDialog onCancel={exit.cancelExit} onDiscard={exit.discardAndExit} />
                ) : null}
            </main>
        </WorkspaceStoreProvider>
    );
}
