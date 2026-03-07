import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { MergeRequest } from './domain';
import { mergePDFs, savePDFDialog } from './platform';
import { useDocs } from './hooks/useDocs';
import { useTheme } from './hooks/useTheme';
import { useOptimize } from './hooks/useOptimize';
import { AppHeader } from './components/AppHeader';
import { DocumentList } from './components/DocumentList';
import { PreviewPanel } from './components/PreviewPanel';
import { OptimizePopover } from './components/OptimizePopover';

function App() {
    const [status, setStatus] = useState('');
    const { docs, selectedId, selectedDoc, selectedPreviewUrl, setSelectedId, addFiles, removeDoc, updatePageSpec, reorderDocs, rotatePage, isDragOver } = useDocs();
    const { isDark, toggleTheme } = useTheme();
    const { optimizeOptions, popoverProps } = useOptimize();

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
        void listen<string>('app-error', (e) => setStatus(`Errore: ${e.payload}`))
            .then((fn) => { unlisten = fn; });
        return () => unlisten?.();
    }, []);

    const exportMerged = useCallback(async () => {
        if (docs.length === 0) return;
        const outputPath = await savePDFDialog('merged.pdf');
        if (!outputPath) return;
        const req: MergeRequest = {
            inputs: docs.map((d) => ({ path: d.path, pageSpec: d.pageSpec })),
            outputPath,
            optimize: optimizeOptions,
        };
        await mergePDFs(req);
        setStatus('Esportazione completata.');
    }, [docs, optimizeOptions]);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            <AppHeader
                isDark={isDark}
                onToggleTheme={toggleTheme}
                onExport={() => void exportMerged()}
                canExport={docs.length > 0}
                optimizeSlot={<OptimizePopover {...popoverProps} />}
            />

            <div className="relative flex min-h-0 flex-1 overflow-hidden">
                {isDragOver && (
                    <div className="pointer-events-none absolute inset-0 z-50 flex items-center justify-center border-2 border-dashed border-ui-accent bg-ui-accent/10">
                        <span className="rounded-lg bg-ui-surface px-4 py-2 text-sm font-medium text-ui-accent shadow-lg">
                            Rilascia i file qui
                        </span>
                    </div>
                )}

                <aside className="flex shrink-0 flex-col bg-ui-surface/50">
                    <DocumentList
                        docs={docs}
                        selectedId={selectedId}
                        onSelect={setSelectedId}
                        onRemove={removeDoc}
                        onReorder={reorderDocs}
                        onPageSpecChange={updatePageSpec}
                        onAddFiles={() => void addFiles()}
                    />
                </aside>

                <section className="flex min-h-0 flex-1 flex-col overflow-hidden p-6">
                    <PreviewPanel
                        selectedDoc={selectedDoc}
                        previewUrl={selectedPreviewUrl}
                        onStatus={setStatus}
                        onRotate={(pageNum, angle) => void rotatePage(pageNum, angle)}
                    />
                </section>
            </div>

            <footer className="flex h-8 shrink-0 items-center justify-between border-t border-ui-border bg-ui-surface px-4">
                <div className="flex items-center gap-3 text-xs text-ui-text-muted">
                    <div className="flex items-center gap-1.5">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        <span>Pronto</span>
                    </div>
                    {status && (
                        <>
                            <span className="h-3 w-px bg-ui-border" />
                            <span className="truncate">{status}</span>
                        </>
                    )}
                </div>
            </footer>
        </div>
    );
}

export default App;
