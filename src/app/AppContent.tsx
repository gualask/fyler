import { lazy, Suspense, useCallback } from 'react';

import { useAppNotifications } from '@/app/notifications';
import { useExportAction, useOptimize } from '@/features/export';
import { useTutorial, useTutorialFilesAddedHandler } from '@/features/tutorial';
import {
    ProtectedPdfPasswordDialog,
    QuickAddView,
    useAddFilesAction,
    useQuickAdd,
    useQuickAddActions,
    useWorkspace,
} from '@/features/workspace';
import { useTheme } from '@/shared/preferences';

import { AppOverlays } from './overlays/AppOverlays';
import { useAppOverlayState } from './overlays/use-app-overlay-state.hook';
import { MainAppView } from './shell/MainAppView';
import { useAppContentViewState } from './use-app-content-view-state.hook';

const UpdateDialog =
    import.meta.env.MODE === 'standalone'
        ? null
        : lazy(() => import('./updates').then((module) => ({ default: module.UpdateDialog })));

type QuickAddState = ReturnType<typeof useQuickAdd>;
type WorkspaceState = ReturnType<typeof useWorkspace>;

function UpdateDialogSlot() {
    if (!UpdateDialog) return null;

    return (
        <Suspense fallback={null}>
            <UpdateDialog />
        </Suspense>
    );
}

function useQuickAddFileHandlers({
    quickAdd,
    workspace,
    handleExitQuickAdd,
    isBusy,
}: {
    quickAdd: QuickAddState;
    workspace: WorkspaceState;
    handleExitQuickAdd: () => void;
    isBusy: boolean;
}) {
    const { onFileRemoved, quickAddFileOrder } = quickAdd;
    const { removeFile, removeFiles } = workspace;

    const handleQuickAddFileRemove = useCallback(
        (id: string) => {
            if (isBusy) return;
            onFileRemoved(id);
            removeFile(id);
        },
        [isBusy, onFileRemoved, removeFile],
    );

    const handleQuickAddDiscardAndExit = useCallback(() => {
        if (isBusy) return;
        const quickAddIds = quickAddFileOrder;

        if (quickAddIds.length > 0) {
            for (const id of quickAddIds) {
                onFileRemoved(id);
            }
            removeFiles(quickAddIds);
        }

        handleExitQuickAdd();
    }, [handleExitQuickAdd, isBusy, onFileRemoved, quickAddFileOrder, removeFiles]);

    return {
        handleQuickAddFileRemove,
        handleQuickAddDiscardAndExit,
    };
}

export function AppContent() {
    const quickAdd = useQuickAdd();
    const notifications = useAppNotifications();
    const isBusy = notifications.isBusy;
    const isQuickAddDisabled = quickAdd.isTransitioning || isBusy;
    const tutorial = useTutorial();
    const onFilesAdded = useTutorialFilesAddedHandler({ quickAdd, tutorial });
    const workspace = useWorkspace({
        onFilesAdded,
        onDropError: notifications.showError,
        onDropImportStart: notifications.beginOpeningFiles,
        onDropImportReady: notifications.finishOpeningFiles,
    });
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const optimize = useOptimize();

    const { rootClassName } = useAppContentViewState({
        quickAdd,
        tutorial,
        workspace,
    });
    const { support, showFinalPreview, setShowFinalPreview } = useAppOverlayState({
        isDark,
        quickAdd,
        workspace,
        optimize,
    });

    const exportMerged = useExportAction({
        finalPages: workspace.finalPages,
        editsByFile: workspace.editsByFile,
        notifications,
        optimize,
    });
    const handleAddFiles = useAddFilesAction({ workspace, notifications });
    const { handleEnterQuickAdd, handleExitQuickAdd } = useQuickAddActions({
        quickAdd,
        notifications,
    });
    const { handleQuickAddFileRemove, handleQuickAddDiscardAndExit } = useQuickAddFileHandlers({
        quickAdd,
        workspace,
        handleExitQuickAdd,
        isBusy,
    });

    return (
        <div className={rootClassName} aria-busy={isBusy}>
            <UpdateDialogSlot />
            {quickAdd.isQuickAdd ? (
                <QuickAddView
                    files={workspace.files}
                    quickAddFileOrder={quickAdd.quickAddFileOrder}
                    disabled={isQuickAddDisabled}
                    isDragOver={workspace.isDragOver}
                    onRemove={handleQuickAddFileRemove}
                    onDiscardAndExit={handleQuickAddDiscardAndExit}
                    onDone={handleExitQuickAdd}
                />
            ) : (
                <MainAppView
                    isDark={isDark}
                    accent={accent}
                    toggleTheme={toggleTheme}
                    setAccent={setAccent}
                    openReportBug={support.openReportBug}
                    tutorialStart={tutorial.start}
                    canHelp={!isBusy && workspace.files.length > 0}
                    onQuickAdd={handleEnterQuickAdd}
                    isQuickAddDisabled={isQuickAddDisabled}
                    canExport={!isBusy && workspace.finalPages.length > 0}
                    canPreview={!isBusy && workspace.finalPages.length > 0}
                    isDragOver={workspace.isDragOver}
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    optimize={optimize}
                    exportMerged={exportMerged}
                    setShowFinalPreview={setShowFinalPreview}
                />
            )}

            <AppOverlays
                notifications={notifications}
                support={support}
                tutorial={tutorial}
                showFinalPreview={showFinalPreview}
                setShowFinalPreview={setShowFinalPreview}
                workspace={workspace}
                imageFit={optimize.imageFit}
                progressVariant={quickAdd.isQuickAdd ? 'compact' : 'standard'}
            />
            <ProtectedPdfPasswordDialog state={workspace.passwordDialog} />
        </div>
    );
}
