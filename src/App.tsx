import { useCallback, useState } from 'react';
import { buildMergeRequest } from './domain';
import { mergePDFs, savePDFDialog } from './platform';
import { PdfCacheProvider } from './hooks/PdfCacheProvider';
import { useFiles } from './hooks/useFiles';
import { useAppNotifications } from './hooks/useAppNotifications';
import { useQuickDrop } from './hooks/useQuickDrop';
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
import { DragOverlay } from './components/DragOverlay';
import { QuickDropView } from './components/QuickDropView';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { AppPreferencesProvider, useTranslation } from './i18n';

function AppContent() {
    const { t } = useTranslation();
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const { isQuickDrop, quickDropFileIds, isTransitioning, onFilesAdded, enterQuickDrop, exitQuickDrop } = useQuickDrop();
    const {
        statusMessage,
        loadingMessage,
        loadingProgress,
        showOpeningFiles,
        showMergePreparing,
        clearLoading,
        showExportCompleted,
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
    const handleAddFiles = useCallback(() => {
        showOpeningFiles();
        void addFiles().finally(() => clearLoading());
    }, [addFiles, clearLoading, showOpeningFiles]);

    const { isDark, toggleTheme } = useTheme();
    const {
        imageFit,
        jpegQuality,
        maxPx,
        targetDpi,
        optimizationPreset,
        setImageFit,
        setJpegQuality,
        setMaxPx,
        setTargetDpi,
        setOptimizationPreset,
        optimizeOptions,
    } = useOptimize();
    const focusedSourceMatchesSelected = Boolean(focusedSource && focusedSource.fileId === selectedFile?.id);
    const focusedSourcePageNum = focusedSourceMatchesSelected ? focusedSource!.pageNum : null;
    const focusedSourceFlashKey = focusedSourceMatchesSelected ? focusedSource!.flashKey : undefined;

    const exportMerged = useCallback(async () => {
        if (finalPages.length === 0) return;
        const outputPath = await savePDFDialog(
            t('header.defaultExportFilename'),
            t('dialogs.filters.pdf'),
        );
        if (!outputPath) return;
        const req = buildMergeRequest(finalPages, editsByFile, outputPath, optimizeOptions);
        showMergePreparing();
        try {
            await mergePDFs(req);
            showExportCompleted();
        } finally {
            clearLoading();
        }
    }, [clearLoading, editsByFile, finalPages, optimizeOptions, showExportCompleted, showMergePreparing, t]);

    return (
        <div className={`flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text transition-[filter,opacity,transform] duration-400 ${isTransitioning ? 'blur-md opacity-0 scale-95' : 'blur-none opacity-100 scale-100'}`}>
            {isQuickDrop ? (
                <QuickDropView
                    files={files}
                    quickDropFileIds={quickDropFileIds}
                    isDragOver={isDragOver}
                    onRemove={removeFile}
                    onExit={() => void exitQuickDrop()}
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
                        onQuickDrop={() => void enterQuickDrop()}
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
                                        maxPx={maxPx}
                                        targetDpi={targetDpi}
                                        optimizationPreset={optimizationPreset}
                                        onImageFitChange={setImageFit}
                                        onJpegQualityChange={setJpegQuality}
                                        onMaxPxChange={setMaxPx}
                                        onTargetDpiChange={setTargetDpi}
                                        onOptimizationPresetChange={setOptimizationPreset}
                                    />
                                </footer>
                            </>
                        )}
                    </div>
                </>
            )}

            {statusMessage && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-lg bg-ui-surface px-4 py-2 text-xs text-ui-text shadow-lg">
                    {statusMessage}
                </div>
            )}

            {loadingMessage && <ProgressModal message={loadingMessage} progress={loadingProgress} />}

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

    return (
        <AppErrorBoundary
            title={t('errors.unhandled')}
            reloadLabel={t('errors.reload')}
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
            <AppShell />
        </AppPreferencesProvider>
    );
}

export default App;
