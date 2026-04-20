import { useCallback, useEffect, useState } from 'react';

import { useAppNotifications } from '@/app/notifications';
import { useExportAction, useOptimize } from '@/features/export';
import { useSupportDiagnostics } from '@/features/support';
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
import { MainAppView } from './shell/MainAppView';
import { UpdateDialog } from './updates';

export function AppContent() {
    const [showFinalPreview, setShowFinalPreview] = useState(false);
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

    const focusedSourceMatchesSelected = Boolean(
        workspace.focusedSource && workspace.focusedSource.fileId === workspace.selectedFile?.id,
    );
    const focusedSourceTarget = focusedSourceMatchesSelected
        ? (workspace.focusedSource?.target ?? null)
        : null;
    const focusedSourceFlashKey = focusedSourceMatchesSelected
        ? workspace.focusedSource?.flashTarget === 'picker'
            ? workspace.focusedSource.flashKey
            : undefined
        : undefined;

    const support = useSupportDiagnostics({
        isDark,
        isQuickAdd: quickAdd.isQuickAdd,
        fileCount: workspace.files.length,
        finalPageCount: workspace.finalPages.length,
        optimizationPreset: optimize.optimizationPreset,
        imageFit: optimize.imageFit,
        targetDpi: optimize.targetDpi,
        jpegQuality: optimize.jpegQuality,
    });

    const exportMerged = useExportAction({ workspace, notifications, optimize });
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
    const isTutorialReady =
        !quickAdd.isQuickAdd &&
        !quickAdd.isTransitioning &&
        workspace.files.length > 0 &&
        workspace.selectedFile !== null &&
        workspace.finalPages.length > 0;

    useEffect(() => {
        tutorial.maybeAutoStart(isTutorialReady);
    }, [isTutorialReady, tutorial.maybeAutoStart]);

    const rootClassName = `flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text transition-[filter,opacity,transform] duration-400 ease-out ${quickAdd.isTransitioning ? 'blur-md opacity-0 scale-95' : 'blur-none opacity-100 scale-100'}`;

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
