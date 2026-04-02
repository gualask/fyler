import { useState } from 'react';
import { useAppNotifications } from '@/app/notifications';
import { ProgressModal, Toast } from '@/app/overlays';
import { AppProviders } from '@/app/providers';
import { AppErrorBoundary } from '@/app/shell/AppErrorBoundary';
import { AppHeader } from '@/app/shell/AppHeader';
import { UpdateDialog } from '@/app/updates';
import { OutputPanel, useExportAction, useOptimize } from '@/features/export';
import { FinalDocument } from '@/features/final-document';
import { PagePicker } from '@/features/page-picker';
import { PreviewModal } from '@/features/preview';
import { SupportDialog, useSupportDiagnostics } from '@/features/support';
import {
    TUTORIAL_TARGETS,
    TutorialOverlay,
    tutorialTargetProps,
    useTutorial,
    useTutorialFilesAddedHandler,
} from '@/features/tutorial';
import {
    DragOverlay,
    EmptyState,
    FileList,
    QuickAddView,
    useAddFilesAction,
    useQuickAdd,
    useQuickAddActions,
    useWorkspace,
} from '@/features/workspace';
import { PdfCacheProvider } from '@/infra/pdf';
import { useDiagnostics } from '@/shared/diagnostics';
import { useTranslation } from '@/shared/i18n';
import { useTheme } from '@/shared/preferences';

type WorkspaceApi = ReturnType<typeof useWorkspace>;
type OptimizeApi = ReturnType<typeof useOptimize>;
type NotificationsApi = ReturnType<typeof useAppNotifications>;
type TutorialApi = ReturnType<typeof useTutorial>;
type SupportApi = ReturnType<typeof useSupportDiagnostics>;
type ThemeApi = ReturnType<typeof useTheme>;

function MainAppView({
    isDark,
    accent,
    toggleTheme,
    setAccent,
    openReportBug,
    openAbout,
    tutorialStart,
    canHelp,
    onQuickAdd,
    canExport,
    canPreview,
    isDragOver,
    workspace,
    handleAddFiles,
    focusedSourcePageNum,
    focusedSourceFlashKey,
    optimize,
    exportMerged,
    setShowFinalPreview,
}: {
    isDark: ThemeApi['isDark'];
    accent: ThemeApi['accent'];
    toggleTheme: ThemeApi['toggleTheme'];
    setAccent: ThemeApi['setAccent'];
    openReportBug: () => void;
    openAbout: () => void;
    tutorialStart: () => void;
    canHelp: boolean;
    onQuickAdd: () => void;
    canExport: boolean;
    canPreview: boolean;
    isDragOver: boolean;
    workspace: WorkspaceApi;
    handleAddFiles: () => void;
    focusedSourcePageNum: number | null;
    focusedSourceFlashKey?: number;
    optimize: OptimizeApi;
    exportMerged: () => Promise<void>;
    setShowFinalPreview: (value: boolean) => void;
}) {
    return (
        <>
            <AppHeader
                settings={{
                    isDark,
                    accent,
                    onToggleTheme: toggleTheme,
                    onSetAccent: setAccent,
                    onReportBug: openReportBug,
                    onOpenAbout: openAbout,
                }}
                onExport={() => void exportMerged()}
                canExport={canExport}
                onPreview={() => setShowFinalPreview(true)}
                canPreview={canPreview}
                onQuickAdd={onQuickAdd}
                onHelp={tutorialStart}
                canHelp={canHelp}
            />

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {isDragOver && <DragOverlay />}

                {workspace.files.length === 0 ? (
                    <EmptyState onAddFiles={handleAddFiles} />
                ) : (
                    <>
                        <div
                            className="grid min-h-0 flex-1 overflow-hidden"
                            style={{
                                gridTemplateColumns:
                                    'minmax(200px, 30fr) minmax(200px, 40fr) minmax(200px, 30fr)',
                            }}
                        >
                            <aside
                                {...tutorialTargetProps(TUTORIAL_TARGETS.fileList)}
                                className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source"
                            >
                                <FileList
                                    files={workspace.files}
                                    finalPages={workspace.finalPages}
                                    selectedId={workspace.selectedId}
                                    onSelect={workspace.selectFile}
                                    onRemove={workspace.removeFile}
                                    onAddFiles={handleAddFiles}
                                    onClearFiles={workspace.clearAllFiles}
                                />
                            </aside>

                            <section
                                {...tutorialTargetProps(TUTORIAL_TARGETS.pagePicker)}
                                className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source"
                            >
                                <PagePicker
                                    key={workspace.selectedFile?.id}
                                    file={workspace.selectedFile}
                                    finalPages={workspace.finalPages}
                                    onTogglePage={workspace.togglePage}
                                    onToggleRange={workspace.togglePageRange}
                                    onSetPages={workspace.setPagesForFile}
                                    onSelectAll={workspace.selectAll}
                                    onDeselectAll={workspace.deselectAll}
                                    onRotatePage={workspace.rotatePage}
                                    editsByFile={workspace.editsByFile}
                                    focusedPageNum={focusedSourcePageNum}
                                    focusFlashKey={focusedSourceFlashKey}
                                />
                            </section>

                            <section
                                {...tutorialTargetProps(TUTORIAL_TARGETS.finalDocument)}
                                className="min-w-0 overflow-hidden bg-ui-output"
                            >
                                <FinalDocument
                                    finalPages={workspace.finalPages}
                                    files={workspace.files}
                                    selectedPageId={
                                        workspace.focusedSource
                                            ? `${workspace.focusedSource.fileId}:${workspace.focusedSource.pageNum}`
                                            : null
                                    }
                                    onReorder={workspace.reorderFinalPages}
                                    onMovePageToIndex={workspace.moveFinalPageToIndex}
                                    onRemove={workspace.removeFinalPage}
                                    onSelectPage={workspace.focusFinalPageSource}
                                    onRotatePage={workspace.rotatePage}
                                    editsByFile={workspace.editsByFile}
                                />
                            </section>
                        </div>

                        <footer className="shrink-0 border-t border-ui-border bg-ui-surface">
                            <OutputPanel
                                imageFit={optimize.imageFit}
                                jpegQuality={optimize.jpegQuality}
                                targetDpi={optimize.targetDpi}
                                optimizationPreset={optimize.optimizationPreset}
                                onImageFitChange={optimize.setImageFit}
                                onJpegQualityChange={optimize.setJpegQuality}
                                onTargetDpiChange={optimize.setTargetDpi}
                                onOptimizationPresetChange={optimize.setOptimizationPreset}
                            />
                        </footer>
                    </>
                )}
            </div>
        </>
    );
}

function AppOverlays({
    notifications,
    support,
    tutorial,
    showFinalPreview,
    setShowFinalPreview,
    workspace,
    optimize,
}: {
    notifications: NotificationsApi;
    support: SupportApi;
    tutorial: TutorialApi;
    showFinalPreview: boolean;
    setShowFinalPreview: (value: boolean) => void;
    workspace: WorkspaceApi;
    optimize: OptimizeApi;
}) {
    return (
        <>
            {notifications.statusMessage && notifications.statusTone && (
                <Toast
                    key={notifications.statusMessage}
                    message={notifications.statusMessage}
                    tone={notifications.statusTone}
                />
            )}

            {notifications.loadingMessage && (
                <ProgressModal
                    message={notifications.loadingMessage}
                    progress={notifications.loadingProgress}
                />
            )}

            <SupportDialog
                key={support.supportDialogMode ?? 'closed'}
                mode={support.supportDialogMode}
                snapshot={support.diagnosticsSnapshot}
                onClose={support.closeSupportDialog}
                onCopyDiagnostics={support.copyDiagnostics}
                onOpenGitHubIssues={support.openGitHubIssues}
                onOpenReportBug={support.openReportBug}
            />

            {tutorial.isActive && tutorial.currentStep !== null && (
                <TutorialOverlay
                    currentStep={tutorial.currentStep}
                    onNext={tutorial.next}
                    onSkip={tutorial.skip}
                />
            )}

            {showFinalPreview && (
                <PreviewModal
                    finalPages={workspace.finalPages}
                    files={workspace.files}
                    editsByFile={workspace.editsByFile}
                    imageFit={optimize.imageFit}
                    matchExportedImages
                    onClose={() => setShowFinalPreview(false)}
                />
            )}
        </>
    );
}

function AppContent() {
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
    const focusedSourcePageNum = focusedSourceMatchesSelected
        ? (workspace.focusedSource?.pageNum ?? null)
        : null;
    const focusedSourceFlashKey = focusedSourceMatchesSelected
        ? workspace.focusedSource?.flashKey
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

    const rootClassName = `flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text transition-[filter,opacity,transform] duration-400 ease-out ${quickAdd.isTransitioning ? 'blur-md opacity-0 scale-95' : 'blur-none opacity-100 scale-100'}`;

    return (
        <div className={rootClassName}>
            <UpdateDialog />
            {quickAdd.isQuickAdd ? (
                <QuickAddView
                    files={workspace.files}
                    quickAddFileIds={quickAdd.quickAddFileIds}
                    isDragOver={workspace.isDragOver}
                    onRemove={workspace.removeFile}
                    onExit={handleExitQuickAdd}
                />
            ) : (
                <MainAppView
                    isDark={isDark}
                    accent={accent}
                    toggleTheme={toggleTheme}
                    setAccent={setAccent}
                    openReportBug={support.openReportBug}
                    openAbout={support.openAbout}
                    tutorialStart={tutorial.start}
                    canHelp={workspace.files.length > 0}
                    onQuickAdd={handleEnterQuickAdd}
                    canExport={workspace.finalPages.length > 0}
                    canPreview={workspace.finalPages.length > 0}
                    isDragOver={workspace.isDragOver}
                    workspace={workspace}
                    handleAddFiles={handleAddFiles}
                    focusedSourcePageNum={focusedSourcePageNum}
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
                optimize={optimize}
            />
        </div>
    );
}

function AppShell() {
    const { t } = useTranslation();
    const { record } = useDiagnostics();

    return (
        <AppErrorBoundary
            title={t('errors.unhandled')}
            reloadLabel={t('errors.reload')}
            onError={(message) => {
                record({
                    category: 'app',
                    severity: 'error',
                    message: `React error boundary caught an error: ${message}`,
                });
            }}
        >
            <PdfCacheProvider>
                <AppContent />
            </PdfCacheProvider>
        </AppErrorBoundary>
    );
}

function App() {
    return (
        <AppProviders>
            <AppShell />
        </AppProviders>
    );
}

export default App;
