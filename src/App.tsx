import { useCallback, useState } from 'react';
import type { MergeRequest } from './domain';
import { mergePDFs, savePDFDialog } from './platform';
import { useDocs } from './hooks/useDocs';
import { useTheme } from './hooks/useTheme';
import { AppHeader } from './components/AppHeader';
import { DocumentList } from './components/DocumentList';
import { PreviewPanel } from './components/PreviewPanel';

function App() {
    const { docs, selectedId, selectedDoc, selectedPreviewUrl, error, setSelectedId, addPDFs, removeSelected, updatePageSpec, handleDragStart, handleDragOver, handleDrop } = useDocs();
    const { isDark, toggleTheme } = useTheme();
    const [status, setStatus] = useState('');

    const exportMerged = useCallback(async () => {
        if (docs.length === 0) return;
        try {
            const outputPath = await savePDFDialog('merged.pdf');
            if (!outputPath) return;
            const req: MergeRequest = {
                inputs: docs.map((d) => ({ path: d.path, pageSpec: d.pageSpec })),
                outputPath,
            };
            await mergePDFs(req);
            setStatus('Esportazione completata.');
        } catch (e: unknown) {
            setStatus(e instanceof Error ? e.message : String(e));
        }
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
                    error={error}
                    onSelect={setSelectedId}
                    onPageSpecChange={updatePageSpec}
                    onDragStart={handleDragStart}
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                />
                <PreviewPanel
                    selectedDoc={selectedDoc}
                    previewUrl={selectedPreviewUrl}
                    onStatus={setStatus}
                />
            </main>
            <footer className="flex h-8 shrink-0 items-center border-t border-ui-border bg-ui-surface px-4">
                <span className="truncate text-xs text-ui-text-muted">{status || 'Pronto'}</span>
            </footer>
        </div>
    );
}

export default App;
