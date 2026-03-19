import { useCallback, useState } from 'react';
import { buildMergeRequest } from './domain';
import { DiagnosticsProvider } from './diagnostics';
import {
    mergePDFs,
    savePDFDialog,
} from './platform';
import { PdfCacheProvider } from './hooks/PdfCacheProvider';
import { useFiles } from './hooks/useFiles';
import { useAppNotifications } from './hooks/useAppNotifications';
import { useQuickAdd } from './hooks/useQuickAdd';
import { useDiagnostics } from './diagnostics/useDiagnostics';
import { useTheme } from './hooks/useTheme';
import { useOptimize } from './hooks/useOptimize';
import { AppHeader } from './components/AppHeader';
import { FileList } from './components/FileList';
import { PagePicker } from './components/page-picker';
import { FinalDocument } from './components/final-document';
import { PreviewModal } from './components/preview';
import { OutputPanel } from './components/OutputPanel';
import { ProgressModal } from './components/ProgressModal';
import { EmptyState } from './components/EmptyState';
import { Toast } from './components/Toast';
import { DragOverlay } from './components/DragOverlay';
import { QuickAddView } from './components/QuickAddView';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { UpdateDialog } from './components/UpdateDialog';
import { SupportDialog } from './components/support/SupportDialog';
import { useSupportDiagnostics } from './components/support/useSupportDiagnostics';
import { AppPreferencesProvider, useTranslation } from './i18n';

function AppContent() {
    const { t } = useTranslation();
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const { isQuickAdd, quickAddFileIds, isTransitioning, onFilesAdded, enterQuickAdd, exitQuickAdd } = useQuickAdd();
    const {
        statusMessage,
        statusTone,
        loadingMessage,
        loadingProgress,
        showOpeningFiles,
        showMergePreparing,
        clearLoading,
        showExportCompleted,
        showExportCompletedWithOptimizationWarning,
        showError,
    } = useAppNotifications();

    const {
        files,
        editsByFile,
        selectedId,
        selectedFile,
        selectFile,
        focusedSource,
        addFiles,
        removeFile,
        clearAllFiles,
        isDragOver,
        finalPages,
        togglePage,
        togglePageRange,
        setPagesForFile,
        selectAll,
        deselectAll,
        rotatePage,
        removeFinalPage,
        reorderFinalPages,
        moveFinalPageToIndex,
        focusFinalPageSource,
    } = useFiles({ onFilesAdded });

    const { isDark, toggleTheme } = useTheme();
    const {
        imageFit,
        jpegQuality,
        targetDpi,
        optimizationPreset,
        setImageFit,
        setJpegQuality,
        setTargetDpi,
        setOptimizationPreset,
        optimizeOptions,
    } = useOptimize();
    const focusedSourceMatchesSelected = Boolean(focusedSource && focusedSource.fileId === selectedFile?.id);
    const focusedSourcePageNum = focusedSourceMatchesSelected ? focusedSource!.pageNum : null;
    const focusedSourceFlashKey = focusedSourceMatchesSelected ? focusedSource!.flashKey : undefined;
    const {
        supportDialogMode,
        diagnosticsSnapshot,
        openReportBug,
        openAbout,
        closeSupportDialog,
        copyDiagnostics,
        openGitHubIssues,
        logFilesDialogStarted,
        logFilesDialogResult,
        logFilesDialogFailure,
        logQuickAddSuccess,
        logQuickAddFailure,
        logExportStarted,
        logExportCompleted,
        logExportWarning,
        logExportFailure,
    } = useSupportDiagnostics({
        isDark,
        isQuickAdd,
        fileCount: files.length,
        finalPageCount: finalPages.length,
        optimizationPreset,
        imageFit,
        targetDpi,
        jpegQuality,
    });

    const exportMerged = useCallback(async () => {
        if (finalPages.length === 0) return;
        const outputPath = await savePDFDialog(
            t('header.defaultExportFilename'),
            t('dialogs.filters.pdf'),
        );
        if (!outputPath) return;
        const req = buildMergeRequest(finalPages, editsByFile, outputPath, optimizeOptions);
        logExportStarted(finalPages.length);
        showMergePreparing();
        try {
            const result = await mergePDFs(req);
            if (result.optimizationFailedCount > 0) {
                logExportWarning(result.optimizationFailedCount);
                showExportCompletedWithOptimizationWarning(result.optimizationFailedCount);
            } else {
                logExportCompleted(finalPages.length);
                showExportCompleted();
            }
        } catch (error) {
            logExportFailure(error);
            showError(error);
        } finally {
            clearLoading();
        }
    }, [
        clearLoading,
        editsByFile,
        finalPages,
        logExportCompleted,
        logExportFailure,
        logExportStarted,
        logExportWarning,
        optimizeOptions,
        showExportCompleted,
        showExportCompletedWithOptimizationWarning,
        showError,
        showMergePreparing,
        t,
    ]);

    const handleAddFiles = useCallback(() => {
        logFilesDialogStarted();
        showOpeningFiles();
        void addFiles()
            .then((addedFiles) => {
                logFilesDialogResult(addedFiles.length);
            })
            .catch((error) => {
                logFilesDialogFailure(error);
                showError(error);
            })
            .finally(() => clearLoading());
    }, [addFiles, clearLoading, logFilesDialogFailure, logFilesDialogResult, logFilesDialogStarted, showError, showOpeningFiles]);

    const handleEnterQuickAdd = useCallback(() => {
        void enterQuickAdd()
            .then(() => {
                logQuickAddSuccess('enter');
            })
            .catch((error) => {
                logQuickAddFailure('enter', error);
                showError(error);
            });
    }, [enterQuickAdd, logQuickAddFailure, logQuickAddSuccess, showError]);

    const handleExitQuickAdd = useCallback(() => {
        void exitQuickAdd()
            .then(() => {
                logQuickAddSuccess('exit');
            })
            .catch((error) => {
                logQuickAddFailure('exit', error);
                showError(error);
            });
    }, [exitQuickAdd, logQuickAddFailure, logQuickAddSuccess, showError]);

    return (
        <div className={`flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text transition-[filter,opacity,transform] duration-400 ease-out ${isTransitioning ? 'blur-md opacity-0 scale-95' : 'blur-none opacity-100 scale-100'}`}>
            <UpdateDialog />
            {isQuickAdd ? (
                <QuickAddView
                    files={files}
                    quickAddFileIds={quickAddFileIds}
                    isDragOver={isDragOver}
                    onRemove={removeFile}
                    onExit={handleExitQuickAdd}
                />
            ) : (
                <>
                    <AppHeader
                        isDark={isDark}
                        onToggleTheme={toggleTheme}
                        onExport={() => void exportMerged()}
                        canExport={finalPages.length > 0}
                        onPreview={() => setShowFinalPreview(true)}
                        canPreview={finalPages.length > 0}
                        onQuickAdd={handleEnterQuickAdd}
                        onReportBug={openReportBug}
                        onCopyDiagnostics={() => void copyDiagnostics().catch(showError)}
                        onOpenGitHubIssues={() => void openGitHubIssues().catch(showError)}
                        onOpenAbout={openAbout}
                    />

                    <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                        {isDragOver && <DragOverlay />}

                        {files.length === 0 ? (
                            <EmptyState onAddFiles={handleAddFiles} />
                        ) : (
                            <>
                                <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: 'minmax(200px, 30fr) minmax(200px, 40fr) minmax(200px, 30fr)' }}>
                                    <aside className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source">
                                        <FileList
                                            files={files}
                                            finalPages={finalPages}
                                            selectedId={selectedId}
                                            onSelect={selectFile}
                                            onRemove={removeFile}
                                            onAddFiles={handleAddFiles}
                                            onClearFiles={clearAllFiles}
                                        />
                                    </aside>

                                    <section className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source">
                                        <PagePicker
                                            key={selectedFile?.id}
                                            file={selectedFile}
                                            finalPages={finalPages}
                                            onTogglePage={togglePage}
                                            onToggleRange={togglePageRange}
                                            onSetPages={setPagesForFile}
                                            onSelectAll={selectAll}
                                            onDeselectAll={deselectAll}
                                            onRotatePage={rotatePage}
                                            editsByFile={editsByFile}
                                            focusedPageNum={focusedSourcePageNum}
                                            focusFlashKey={focusedSourceFlashKey}
                                        />
                                    </section>

                                    <section className="min-w-0 overflow-hidden bg-ui-output">
                                        <FinalDocument
                                            finalPages={finalPages}
                                            files={files}
                                            selectedPageId={focusedSource ? `${focusedSource.fileId}:${focusedSource.pageNum}` : null}
                                            onReorder={reorderFinalPages}
                                            onMovePageToIndex={moveFinalPageToIndex}
                                            onRemove={removeFinalPage}
                                            onSelectPage={focusFinalPageSource}
                                            onRotatePage={rotatePage}
                                            editsByFile={editsByFile}
                                        />
                                    </section>
                                </div>

                                <footer className="shrink-0 border-t border-ui-border bg-ui-surface">
                                    <OutputPanel
                                        imageFit={imageFit}
                                        jpegQuality={jpegQuality}
                                        targetDpi={targetDpi}
                                        optimizationPreset={optimizationPreset}
                                        onImageFitChange={setImageFit}
                                        onJpegQualityChange={setJpegQuality}
                                        onTargetDpiChange={setTargetDpi}
                                        onOptimizationPresetChange={setOptimizationPreset}
                                    />
                                </footer>
                            </>
                        )}
                    </div>
                </>
            )}

            {statusMessage && statusTone && (
                <Toast key={statusMessage} message={statusMessage} tone={statusTone} />
            )}

            {loadingMessage && <ProgressModal message={loadingMessage} progress={loadingProgress} />}

            <SupportDialog
                key={supportDialogMode ?? 'closed'}
                mode={supportDialogMode}
                snapshot={diagnosticsSnapshot}
                onClose={closeSupportDialog}
                onCopyDiagnostics={copyDiagnostics}
                onOpenGitHubIssues={openGitHubIssues}
                onOpenReportBug={openReportBug}
            />

            {showFinalPreview && (
                <PreviewModal
                    finalPages={finalPages}
                    files={files}
                    editsByFile={editsByFile}
                    imageFit={imageFit}
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
