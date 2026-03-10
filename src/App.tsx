import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { buildMergeRequest } from './domain';
import { mergePDFs, savePDFDialog } from './platform';
import { PdfCacheProvider } from './hooks/PdfCacheProvider';
import { useFiles } from './hooks/useFiles';
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

function toErrorMessage(value: unknown): string {
    return value instanceof Error ? value.message : String(value);
}

function AppContent() {
    const [status, setStatus] = useState('');
    const [showFinalPreview, setShowFinalPreview] = useState(false);
    const [loading, setLoading] = useState<{ message: string; progress?: number } | null>(null);
    const { isQuickDrop, quickDropFileIds, isTransitioning, onFilesAdded, enterQuickDrop, exitQuickDrop } = useQuickDrop();

    useEffect(() => {
        if (!status) return;
        const t = setTimeout(() => setStatus(''), 4000);
        return () => clearTimeout(t);
    }, [status]);

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
        setFromPageSpec,
        selectAll,
        deselectAll,
        rotatePage,
        removeFinalPage,
        reorderFinalPages,
        moveFinalPageToIndex,
        focusFinalPageSource,
    } = useFiles({ onFilesAdded });
    const handleAddFiles = useCallback(() => {
        setLoading({ message: 'Caricamento file...' });
        void addFiles().finally(() => setLoading(null));
    }, [addFiles]);

    const { isDark, toggleTheme } = useTheme();
    const {
        imageFit,
        isAdvancedOpen,
        jpegQuality,
        maxPx,
        optimizationPreset,
        setImageFit,
        setIsAdvancedOpen,
        setJpegQuality,
        setMaxPx,
        setOptimizationPreset,
        optimizeOptions,
    } = useOptimize();
    const focusedSourceMatchesSelected = Boolean(focusedSource && focusedSource.fileId === selectedFile?.id);
    const focusedSourcePageNum = focusedSourceMatchesSelected ? focusedSource!.pageNum : null;
    const focusedSourceFlashKey = focusedSourceMatchesSelected ? focusedSource!.flashKey : undefined;

    useEffect(() => {
        const handleError = (e: ErrorEvent) => {
            e.preventDefault();
            setStatus(`Errore: ${toErrorMessage(e.error ?? e.message)}`);
        };
        const handleRejection = (e: PromiseRejectionEvent) => {
            e.preventDefault();
            setStatus(`Errore: ${toErrorMessage(e.reason)}`);
        };
        window.addEventListener('error', handleError);
        window.addEventListener('unhandledrejection', handleRejection);
        return () => {
            window.removeEventListener('error', handleError);
            window.removeEventListener('unhandledrejection', handleRejection);
        };
    }, []);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        void listen<string>('app-error', (e) => setStatus(`Errore: ${e.payload}`)).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
    }, []);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        void listen<string>('app-status', (e) => setStatus(e.payload)).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
    }, []);

    useEffect(() => {
        let unlisten: (() => void) | undefined;
        void listen<{ message: string; progress: number }>('merge-progress', (e) => {
            setLoading({ message: e.payload.message, progress: e.payload.progress });
        }).then((fn) => {
            unlisten = fn;
        });
        return () => unlisten?.();
    }, []);

    const exportMerged = useCallback(async () => {
        if (finalPages.length === 0) return;
        const outputPath = await savePDFDialog('merged.pdf');
        if (!outputPath) return;
        const req = buildMergeRequest(finalPages, editsByFile, outputPath, optimizeOptions);
        setLoading({ message: 'Preparazione...', progress: 0 });
        try {
            await mergePDFs(req);
            setStatus('Esportazione completata.');
        } finally {
            setLoading(null);
        }
    }, [editsByFile, finalPages, optimizeOptions]);

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
                                            onSetFromSpec={setFromPageSpec}
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
                                        isAdvancedOpen={isAdvancedOpen}
                                        jpegQuality={jpegQuality}
                                        maxPx={maxPx}
                                        optimizationPreset={optimizationPreset}
                                        onAdvancedOpenChange={setIsAdvancedOpen}
                                        onImageFitChange={setImageFit}
                                        onJpegQualityChange={setJpegQuality}
                                        onMaxPxChange={setMaxPx}
                                        onOptimizationPresetChange={setOptimizationPreset}
                                    />
                                </footer>
                            </>
                        )}
                    </div>
                </>
            )}

            {status && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-lg bg-ui-surface px-4 py-2 text-xs text-ui-text shadow-lg">
                    {status}
                </div>
            )}

            {loading && <ProgressModal {...loading} />}

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

function App() {
    return (
        <AppErrorBoundary>
            <PdfCacheProvider>
                <AppContent />
            </PdfCacheProvider>
        </AppErrorBoundary>
    );
}

export default App;
