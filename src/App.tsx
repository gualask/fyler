import { useCallback, useMemo, useRef, useState } from 'react';
import {
    IconDownload,
    IconFilePlus,
    IconFileTypePdf,
    IconTrash,
} from '@tabler/icons-react';
import type { Doc, MergeRequest } from './domain';
import { getPDFPreviewUrl, mergePDFs, openPDFsDialog, savePDFDialog } from './platform';
import { DocumentRow } from './components/DocumentRow';
import { PdfPreview } from './components/PdfPreview';

function App() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [status, setStatus] = useState<string>('');

    const draggedId = useRef<string | null>(null);

    const selectedDoc = useMemo(
        () => docs.find((d) => d.id === selectedId) ?? null,
        [docs, selectedId],
    );
    const selectedPreviewUrl = useMemo(
        () => (selectedDoc ? getPDFPreviewUrl(selectedDoc.path) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedDoc?.path],
    );

    const addPDFs = useCallback(async () => {
        try {
            setError(null);
            const newDocs = await openPDFsDialog();
            if (newDocs.length === 0) return;
            setDocs((prev) => [...prev, ...newDocs]);
            setSelectedId((prev) => prev ?? newDocs[0].id);
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    }, []);

    const removeSelected = useCallback(() => {
        setDocs((prev) => {
            const next = prev.filter((d) => d.id !== selectedId);
            setSelectedId(next.length ? next[0].id : null);
            return next;
        });
    }, [selectedId]);

    const updatePageSpec = useCallback((id: string, pageSpec: string) => {
        setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, pageSpec } : d)));
    }, []);

    const handleDragStart = useCallback((id: string) => {
        draggedId.current = id;
    }, []);

    const handleDragOver = useCallback((_e: React.DragEvent) => {
        // preventDefault già fatto in DocumentRow
    }, []);

    const handleDrop = useCallback((targetId: string) => {
        const fromId = draggedId.current;
        if (!fromId || fromId === targetId) return;
        setDocs((prev) => {
            const fromIdx = prev.findIndex((d) => d.id === fromId);
            const toIdx = prev.findIndex((d) => d.id === targetId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const next = [...prev];
            const [item] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, item);
            return next;
        });
        draggedId.current = null;
    }, []);

    const exportMerged = useCallback(async () => {
        if (docs.length === 0) return;
        try {
            setError(null);
            const outputPath = await savePDFDialog('merged.pdf');
            if (!outputPath) return;
            const req: MergeRequest = {
                inputs: docs.map((d) => ({ path: d.path, pageSpec: d.pageSpec })),
                outputPath,
            };
            await mergePDFs(req);
            setStatus('Esportazione completata.');
        } catch (e: any) {
            setError(e?.message ?? String(e));
        }
    }, [docs]);

    return (
        <div className="flex h-screen flex-col overflow-hidden bg-gray-50 text-gray-900">
            {/* Header */}
            <header className="flex h-14 shrink-0 items-center justify-between border-b border-gray-200 bg-white px-4 shadow-sm">
                <div className="flex items-center gap-2">
                    <IconFileTypePdf size={20} className="text-red-500" />
                    <span className="text-base font-semibold">Fyler</span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={addPDFs}
                        className="flex items-center gap-1.5 rounded-md bg-blue-50 px-3 py-1.5 text-sm font-medium text-blue-700 hover:bg-blue-100"
                    >
                        <IconFilePlus size={15} />
                        Aggiungi PDF
                    </button>
                    <button
                        disabled={!selectedId}
                        onClick={removeSelected}
                        className="flex items-center gap-1.5 rounded-md bg-red-50 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-100 disabled:opacity-40"
                    >
                        <IconTrash size={15} />
                        Rimuovi
                    </button>
                    <button
                        disabled={docs.length === 0}
                        onClick={exportMerged}
                        className="flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-40"
                    >
                        <IconDownload size={15} />
                        Esporta PDF
                    </button>
                </div>
            </header>

            {/* Main */}
            <main className="flex min-h-0 flex-1 gap-4 overflow-hidden p-4">
                {/* Colonna sinistra: lista documenti */}
                <div className="flex w-[420px] shrink-0 flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Documenti</span>
                        <span className="text-xs text-gray-400">{docs.length} file</span>
                    </div>

                    {error && (
                        <p className="rounded bg-red-50 px-2 py-1 text-xs text-red-600">{error}</p>
                    )}

                    <div className="min-h-0 flex-1 overflow-y-auto">
                        {docs.length === 0 ? (
                            <p className="text-sm text-gray-400">
                                Aggiungi uno o più PDF per iniziare.
                            </p>
                        ) : (
                            <div className="flex flex-col gap-2">
                                {docs.map((d) => (
                                    <DocumentRow
                                        key={d.id}
                                        doc={d}
                                        selected={d.id === selectedId}
                                        onSelect={() => setSelectedId(d.id)}
                                        onPageSpecChange={(v) => updatePageSpec(d.id, v)}
                                        onDragStart={handleDragStart}
                                        onDragOver={handleDragOver}
                                        onDrop={handleDrop}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Colonna destra: anteprima PDF */}
                <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold">Anteprima</span>
                        <span className="max-w-xs truncate text-xs text-gray-400">
                            {selectedDoc ? selectedDoc.name : 'Nessun documento selezionato'}
                        </span>
                    </div>

                    <div className="min-h-0 flex-1">
                        {selectedDoc ? (
                            <PdfPreview
                                key={selectedDoc.id}
                                url={selectedPreviewUrl!}
                                onStatus={setStatus}
                            />
                        ) : (
                            <p className="text-sm text-gray-400">
                                Seleziona un documento per visualizzare l'anteprima.
                            </p>
                        )}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="flex h-8 shrink-0 items-center border-t border-gray-200 bg-white px-4">
                <span className="truncate text-xs text-gray-400">{status || 'Pronto'}</span>
            </footer>
        </div>
    );
}

export default App;
