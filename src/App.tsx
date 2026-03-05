import { useCallback, useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import type { MergeRequest } from './domain';
import { mergePDFs, savePDFDialog } from './platform';
import { useDocs } from './hooks/useDocs';
import { useTheme } from './hooks/useTheme';
import { AppHeader } from './components/AppHeader';
import { DocumentList } from './components/DocumentList';
import { PreviewPanel } from './components/PreviewPanel';

function App() {
    const { docs, selectedId, selectedDoc, selectedPreviewUrl, setSelectedId, addPDFs, removeSelected, updatePageSpec, dragHandlers, rotatePage } = useDocs();
    const { isDark, toggleTheme } = useTheme();
    const [status, setStatus] = useState('');

    // Global error handler: unhandled promise rejections (invoke errors, plugin errors)
    useEffect(() => {
        const handleRejection = (e: PromiseRejectionEvent) => {
            e.preventDefault();
            const msg = e.reason instanceof Error ? e.reason.message : String(e.reason);
            setStatus(`Errore: ${msg}`);
        };
        window.addEventListener('unhandledrejection', handleRejection);
        return () => window.removeEventListener('unhandledrejection', handleRejection);
    }, []);

    // Global error handler: backend panics emitted via "app-error" event
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
        };
        await mergePDFs(req);
        setStatus('Esportazione completata.');
    }, [docs]);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-ui-bg text-ui-text">
            <AppHeader
                isDark={isDark}
                onToggleTheme={toggleTheme}
                onAddPDFs={() => void addPDFs()}
                onRemove={removeSelected}
                canRemove={!!selectedId}
                onExport={() => void exportMerged()}
                canExport={docs.length > 0}
            />
            <main className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
                <DocumentList
                    docs={docs}
                    selectedId={selectedId}
                    onSelect={setSelectedId}
                    onPageSpecChange={updatePageSpec}
                    dragHandlers={dragHandlers}
                />
                <PreviewPanel
                    selectedDoc={selectedDoc}
                    previewUrl={selectedPreviewUrl}
                    onStatus={setStatus}
                    onRotate={(pageNum, angle) => void rotatePage(pageNum, angle)}
                />
            </main>
            <footer className="flex h-8 shrink-0 items-center border-t border-ui-border bg-ui-surface px-4">
                <span className="truncate text-xs text-ui-text-muted">{status || 'Pronto'}</span>
            </footer>
        </div>
    );
}

export default App;
