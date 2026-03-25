import { useState } from 'react';
import { DiagnosticsProvider } from '@/diagnostics';
import { PdfCacheProvider } from '@/pdf/PdfCacheProvider';
import { useFiles } from '@/files/useFiles';
import { useAppNotifications } from '@/hooks/useAppNotifications';
import { useQuickAdd } from '@/hooks/useQuickAdd';
import { useDiagnostics } from '@/diagnostics/useDiagnostics';
import { useTheme } from '@/i18n';
import { useOptimize } from '@/hooks/useOptimize';
import { useExportAction } from '@/hooks/useExportAction';
import { useAddFilesAction } from '@/hooks/useAddFilesAction';
import { useQuickAddActions } from '@/hooks/useQuickAddActions';
import { AppHeader } from '@/components/AppHeader';
import { FileList } from '@/components/FileList';
import { PagePicker } from '@/components/page-picker';
import { FinalDocument } from '@/components/final-document';
import { PreviewModal } from '@/components/preview';
import { OutputPanel } from '@/components/OutputPanel';
import { ProgressModal } from '@/components/ProgressModal';
import { EmptyState } from '@/components/EmptyState';
import { Toast } from '@/components/Toast';
import { DragOverlay } from '@/components/DragOverlay';
import { QuickAddView } from '@/components/QuickAddView';
import { AppErrorBoundary } from '@/components/AppErrorBoundary';
import { UpdateDialog } from '@/components/UpdateDialog';
import { SupportDialog } from '@/components/support/SupportDialog';
import { useSupportDiagnostics } from '@/components/support/useSupportDiagnostics';
import { TutorialOverlay, useTutorial, TUTORIAL_TARGETS } from '@/components/tutorial';
import { AppPreferencesProvider, useTranslation } from '@/i18n';

function AppContent() {
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const quickAdd = useQuickAdd();
    const notifications = useAppNotifications();
    const tutorial = useTutorial();
    const filesApi = useFiles({
        onFilesAdded: (ids) => {
            quickAdd.onFilesAdded(ids);
            if (!quickAdd.isQuickAdd && !quickAdd.isTransitioning) {
                tutorial.onFirstFilesAdded();
            }
        },
        onDropError: notifications.showError,
    });
    const { isDark, toggleTheme, accent, setAccent } = useTheme();
    const optimize = useOptimize();

    const focusedSourceMatchesSelected = Boolean(filesApi.focusedSource && filesApi.focusedSource.fileId === filesApi.selectedFile?.id);
    const focusedSourcePageNum = focusedSourceMatchesSelected ? filesApi.focusedSource!.pageNum : null;
    const focusedSourceFlashKey = focusedSourceMatchesSelected ? filesApi.focusedSource!.flashKey : undefined;

    const {
        supportDialogMode,
        diagnosticsSnapshot,
        openReportBug,
        openAbout,
        closeSupportDialog,
        copyDiagnostics,
        openGitHubIssues,
    } = useSupportDiagnostics({
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
    const { handleEnterQuickAdd, handleExitQuickAdd } = useQuickAddActions({ quickAdd, notifications });

    return (
        <div className={`flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text transition-[filter,opacity,transform] duration-400 ease-out ${quickAdd.isTransitioning ? 'blur-md opacity-0 scale-95' : 'blur-none opacity-100 scale-100'}`}>
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
                        canExport={filesApi.finalPages.length > 0}
                        onPreview={() => setShowFinalPreview(true)}
                        canPreview={filesApi.finalPages.length > 0}
                        onQuickAdd={handleEnterQuickAdd}
                        onHelp={tutorial.start}
                    />

                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                        {filesApi.isDragOver && <DragOverlay />}

                        {filesApi.files.length === 0 ? (
                            <EmptyState onAddFiles={handleAddFiles} />
                        ) : (
                            <>
                                <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: 'minmax(200px, 30fr) minmax(200px, 40fr) minmax(200px, 30fr)' }}>
                                    <aside data-tutorial={TUTORIAL_TARGETS.fileList} className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source">
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

                                    <section data-tutorial={TUTORIAL_TARGETS.pagePicker} className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source">
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

                                    <section data-tutorial={TUTORIAL_TARGETS.finalDocument} className="min-w-0 overflow-hidden bg-ui-output">
                                        <FinalDocument
                                            finalPages={filesApi.finalPages}
                                            files={filesApi.files}
                                            selectedPageId={filesApi.focusedSource ? `${filesApi.focusedSource.fileId}:${filesApi.focusedSource.pageNum}` : null}
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
            )}

            {notifications.statusMessage && notifications.statusTone && (
                <Toast key={notifications.statusMessage} message={notifications.statusMessage} tone={notifications.statusTone} />
            )}

            {notifications.loadingMessage && <ProgressModal message={notifications.loadingMessage} progress={notifications.loadingProgress} />}

            <SupportDialog
                key={supportDialogMode ?? 'closed'}
                mode={supportDialogMode}
                snapshot={diagnosticsSnapshot}
                onClose={closeSupportDialog}
                onCopyDiagnostics={copyDiagnostics}
                onOpenGitHubIssues={openGitHubIssues}
                onOpenReportBug={openReportBug}
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
        <AppPreferencesProvider>
            <DiagnosticsProvider>
                <AppShell />
            </DiagnosticsProvider>
        </AppPreferencesProvider>
    );
}

export default App;
