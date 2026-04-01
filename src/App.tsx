import { useState } from 'react';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { AppHeader } from '@/components/AppHeader';
import { DragOverlay } from '@/components/DragOverlay';
import { EmptyState } from '@/components/EmptyState';
import { FileList } from '@/components/FileList';
import { FinalDocument } from '@/components/final-document';
import { OutputPanel } from '@/components/OutputPanel';
import { ProgressModal } from '@/components/ProgressModal';
import { PagePicker } from '@/components/page-picker';
import { PreviewModal } from '@/components/preview';
import { QuickAddView } from '@/components/QuickAddView';
import { SupportDialog } from '@/components/support/SupportDialog';
import { useSupportDiagnostics } from '@/components/support/support-diagnostics.hook';
import { Toast } from '@/components/Toast';
import {
    TUTORIAL_TARGETS,
    TutorialOverlay,
    tutorialTargetProps,
    useTutorial,
    useTutorialFilesAddedHandler,
} from '@/components/tutorial';
import { UpdateDialog } from '@/components/UpdateDialog';
import { DiagnosticsProvider, useDiagnostics } from '@/diagnostics';
import { useFiles } from '@/files';
import {
    useAddFilesAction,
    useAppNotifications,
    useExportAction,
    useOptimize,
    useQuickAdd,
    useQuickAddActions,
} from '@/hooks';
import { useTranslation } from '@/i18n';
import { PdfCacheProvider } from '@/pdf';
import { PreferencesProvider, useTheme } from '@/preferences';

type FilesApi = ReturnType<typeof useFiles>;
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
    filesApi,
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
    filesApi: FilesApi;
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

                {filesApi.files.length === 0 ? (
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
                                    files={filesApi.files}
                                    finalPages={filesApi.finalPages}
                                    selectedId={filesApi.selectedId}
                                    onSelect={filesApi.selectFile}
                                    onRemove={filesApi.removeFile}
                                    onAddFiles={handleAddFiles}
                                    onClearFiles={filesApi.clearAllFiles}
                                />
                            </aside>

                            <section
                                {...tutorialTargetProps(TUTORIAL_TARGETS.pagePicker)}
                                className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source"
                            >
                                <PagePicker
                                    key={filesApi.selectedFile?.id}
                                    file={filesApi.selectedFile}
                                    finalPages={filesApi.finalPages}
                                    onTogglePage={filesApi.togglePage}
                                    onToggleRange={filesApi.togglePageRange}
                                    onSetPages={filesApi.setPagesForFile}
                                    onSelectAll={filesApi.selectAll}
                                    onDeselectAll={filesApi.deselectAll}
                                    onRotatePage={filesApi.rotatePage}
                                    editsByFile={filesApi.editsByFile}
                                    focusedPageNum={focusedSourcePageNum}
                                    focusFlashKey={focusedSourceFlashKey}
                                />
                            </section>

                            <section
                                {...tutorialTargetProps(TUTORIAL_TARGETS.finalDocument)}
                                className="min-w-0 overflow-hidden bg-ui-output"
                            >
                                <FinalDocument
                                    finalPages={filesApi.finalPages}
                                    files={filesApi.files}
                                    selectedPageId={
                                        filesApi.focusedSource
                                            ? `${filesApi.focusedSource.fileId}:${filesApi.focusedSource.pageNum}`
                                            : null
                                    }
                                    onReorder={filesApi.reorderFinalPages}
                                    onMovePageToIndex={filesApi.moveFinalPageToIndex}
                                    onRemove={filesApi.removeFinalPage}
                                    onSelectPage={filesApi.focusFinalPageSource}
                                    onRotatePage={filesApi.rotatePage}
                                    editsByFile={filesApi.editsByFile}
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
    filesApi,
    optimize,
}: {
    notifications: NotificationsApi;
    support: SupportApi;
    tutorial: TutorialApi;
    showFinalPreview: boolean;
    setShowFinalPreview: (value: boolean) => void;
    filesApi: FilesApi;
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
                    finalPages={filesApi.finalPages}
                    files={filesApi.files}
                    editsByFile={filesApi.editsByFile}
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
    const filesApi = useFiles({
        onFilesAdded,
        onDropError: notifications.showError,
    });
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const optimize = useOptimize();

    const focusedSourceMatchesSelected = Boolean(
        filesApi.focusedSource && filesApi.focusedSource.fileId === filesApi.selectedFile?.id,
    );
    const focusedSourcePageNum = focusedSourceMatchesSelected
        ? (filesApi.focusedSource?.pageNum ?? null)
        : null;
    const focusedSourceFlashKey = focusedSourceMatchesSelected
        ? filesApi.focusedSource?.flashKey
        : undefined;

    const support = useSupportDiagnostics({
        isDark,
        isQuickAdd: quickAdd.isQuickAdd,
        fileCount: filesApi.files.length,
        finalPageCount: filesApi.finalPages.length,
        optimizationPreset: optimize.optimizationPreset,
        imageFit: optimize.imageFit,
        targetDpi: optimize.targetDpi,
        jpegQuality: optimize.jpegQuality,
    });

    const exportMerged = useExportAction({ files: filesApi, notifications, optimize });
    const handleAddFiles = useAddFilesAction({ files: filesApi, notifications });
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
                    files={filesApi.files}
                    quickAddFileIds={quickAdd.quickAddFileIds}
                    isDragOver={filesApi.isDragOver}
                    onRemove={filesApi.removeFile}
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
                    canHelp={filesApi.files.length > 0}
                    onQuickAdd={handleEnterQuickAdd}
                    canExport={filesApi.finalPages.length > 0}
                    canPreview={filesApi.finalPages.length > 0}
                    isDragOver={filesApi.isDragOver}
                    filesApi={filesApi}
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
                filesApi={filesApi}
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
        <PreferencesProvider>
            <DiagnosticsProvider>
                <AppShell />
            </DiagnosticsProvider>
        </PreferencesProvider>
    );
}

export default App;
