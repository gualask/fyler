import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { finalPagesToMergeInputs, type MergeRequest } from './domain';
import { mergePDFs, savePDFDialog } from './platform';
import { ThumbnailCacheProvider } from './hooks/ThumbnailCacheProvider';
import { useFiles } from './hooks/useFiles';
import { useTheme } from './hooks/useTheme';
import { useOptimize } from './hooks/useOptimize';
import { AppHeader } from './components/AppHeader';
import { FileList } from './components/FileList';
import { PagePicker } from './components/PagePicker';
import { FinalDocument } from './components/FinalDocument';
import { PreviewModal } from './components/PreviewModal';
import { OutputPanel } from './components/OutputPanel';

function AppContent() {
    const [status, setStatus] = useState('');
    const [showFinalPreview, setShowFinalPreview] = useState(false);

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
    } = useFiles();
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

    const exportMerged = useCallback(async () => {
        if (finalPages.length === 0) return;
        const outputPath = await savePDFDialog('merged.pdf');
        if (!outputPath) return;
        const inputs = finalPagesToMergeInputs(finalPages, files);
        const req: MergeRequest = { inputs, outputPath, optimize: optimizeOptions };
        await mergePDFs(req);
        setStatus('Esportazione completata.');
    }, [finalPages, files, optimizeOptions]);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            <AppHeader
                isDark={isDark}
                onToggleTheme={toggleTheme}
                onExport={() => void exportMerged()}
                canExport={finalPages.length > 0}
                onPreview={() => setShowFinalPreview(true)}
                canPreview={finalPages.length > 0}
            />

            <div className="relative grid min-h-0 flex-1 overflow-hidden" style={{ gridTemplateColumns: 'minmax(200px, 35fr) minmax(200px, 30fr) minmax(200px, 35fr)' }}>
                {isDragOver && (
                    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-ui-accent bg-ui-accent/10">
                        <span className="rounded-lg bg-ui-surface px-4 py-2 text-sm font-medium text-ui-accent shadow-lg">
                            Rilascia i file qui
                        </span>
                    </div>
                )}

                <aside className="min-w-0 overflow-hidden border-r border-ui-border bg-ui-source">
                    <FileList
                        files={files}
                        finalPages={finalPages}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onRemove={removeFile}
                        onAddFiles={() => void addFiles()}
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

            {status && (
                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 rounded-lg bg-ui-surface px-4 py-2 text-xs text-ui-text shadow-lg">
                    {status}
                </div>
            )}

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
