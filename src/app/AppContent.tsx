import { useCallback } from 'react';

import { useAppNotifications } from '@/app/notifications';
import { useExportAction, useOptimize } from '@/features/export';
import { useTutorial, useTutorialFilesAddedHandler } from '@/features/tutorial';
import {
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
import { UpdateDialog } from './updates';
import { useAppContentViewState } from './use-app-content-view-state.hook';

export function AppContent() {
    const quickAdd = useQuickAdd();
    const notifications = useAppNotifications();
    const tutorial = useTutorial();
    const onFilesAdded = useTutorialFilesAddedHandler({ quickAdd, tutorial });
    const workspace = useWorkspace({
        onFilesAdded,
        onDropError: notifications.showError,
    });
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const optimize = useOptimize();

    const { focusedSourceTarget, focusedSourceFlashKey, rootClassName } = useAppContentViewState({
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
    const handleQuickAddFileRemove = useCallback(
        (id: string) => {
            quickAdd.onFileRemoved(id);
            workspace.removeFile(id);
        },
        [quickAdd.onFileRemoved, workspace.removeFile],
    );

    return (
        <div className={rootClassName}>
            <UpdateDialog />
            {quickAdd.isQuickAdd ? (
                <QuickAddView
                    files={workspace.files}
                    quickAddFileOrder={quickAdd.quickAddFileOrder}
                    isDragOver={workspace.isDragOver}
                    onRemove={handleQuickAddFileRemove}
                    onExit={handleExitQuickAdd}
                />
            ) : (
                <MainAppView
                    isDark={isDark}
                    accent={accent}
                    toggleTheme={toggleTheme}
                    setAccent={setAccent}
                    openReportBug={support.openReportBug}
                    tutorialStart={tutorial.start}
                    canHelp={workspace.files.length > 0}
                    onQuickAdd={handleEnterQuickAdd}
                    canExport={workspace.finalPages.length > 0}
                    canPreview={workspace.finalPages.length > 0}
                    isDragOver={workspace.isDragOver}
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    focusedSourceTarget={focusedSourceTarget}
                    focusedSourceFlashKey={focusedSourceFlashKey}
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
            />
        </div>
    );
}
