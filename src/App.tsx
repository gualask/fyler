import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { finalPagesToMergeInputs, type MergeRequest } from './domain';
import { mergePDFs, savePDFDialog } from './platform';
import { ThumbnailCacheProvider } from './hooks/ThumbnailCacheProvider';
import { useFiles } from './hooks/useFiles';
import { useQuickDrop } from './hooks/useQuickDrop';
import { useTheme } from './hooks/useTheme';
import { useOptimize } from './hooks/useOptimize';
import { AppHeader } from './components/AppHeader';
import { FileList } from './components/FileList';
import { PagePicker } from './components/PagePicker';
import { FinalDocument } from './components/FinalDocument';
import { PreviewModal } from './components/PreviewModal';
import { OutputPanel } from './components/OutputPanel';
import { ProgressModal } from './components/ProgressModal';
import { EmptyState } from './components/EmptyState';
import { DragOverlay } from './components/DragOverlay';
import { QuickDropView } from './components/QuickDropView';

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
        selectedId,
        selectedFile,
        setSelectedId,
        addFiles,
        removeFile,
        isDragOver,
        finalPages,
        togglePage,
        togglePageRange,
        setFromPageSpec,
        selectAll,
        deselectAll,
        removeFinalPage,
        reorderFinalPages,
    } = useFiles({ onFilesAdded });
    const handleAddFiles = useCallback(() => {
        setLoading({ message: 'Caricamento file...' });
        void addFiles().finally(() => setLoading(null));
    }, [addFiles]);

    const { isDark, toggleTheme } = useTheme();
    const { compression, resize, imageFit, setCompression, setResize, setImageFit, optimizeOptions } = useOptimize();

    useEffect(() => {
        const handleRejection = (e: PromiseRejectionEvent) => {
            e.preventDefault();
            const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
            setStatus(`Errore: ${msg}`);
        };
        window.addEventListener('unhandledrejection', handleRejection);
        return () => window.removeEventListener('unhandledrejection', handleRejection);
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
        const inputs = finalPagesToMergeInputs(finalPages, files);
        const req: MergeRequest = { inputs, outputPath, optimize: optimizeOptions };
        setLoading({ message: 'Preparazione...', progress: 0 });
        try {
            await mergePDFs(req);
            setStatus('Esportazione completata.');
        } finally {
            setLoading(null);
        }
    }, [finalPages, files, optimizeOptions]);

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
                                <div className="grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: 'minmax(200px, 35fr) minmax(200px, 30fr) minmax(200px, 35fr)' }}>
                                    <aside className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source">
                                        <FileList
                                            files={files}
                                            finalPages={finalPages}
                                            selectedId={selectedId}
                                            onSelect={setSelectedId}
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
                                        />
                                    </section>

                                    <section className="min-w-0 overflow-hidden bg-ui-output">
                                        <FinalDocument
                                            finalPages={finalPages}
                                            files={files}
                                            selectedFileId={selectedId}
                                            onReorder={reorderFinalPages}
                                            onRemove={removeFinalPage}
                                        />
                                    </section>
                                </div>

                                <footer className="shrink-0 border-t border-ui-border bg-ui-surface">
                                    <OutputPanel
                                        compression={compression}
                                        resize={resize}
                                        imageFit={imageFit}
                                        onCompressionChange={setCompression}
                                        onResizeChange={setResize}
                                        onImageFitChange={setImageFit}
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
                    imageFit={imageFit}
                    onClose={() => setShowFinalPreview(false)}
                />
            )}
        </div>
    );
}

function App() {
    return (
        <ThumbnailCacheProvider>
            <AppContent />
        </ThumbnailCacheProvider>
    );
}

export default App;
