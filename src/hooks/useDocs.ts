import { useCallback, useMemo, useRef, useState } from 'react';
import type { Doc } from '../domain';
import { getPDFPreviewUrl, openPDFsDialog } from '../platform';

/**
 * Manages the document list state: selection, add, remove,
 * pageSpec update and drag-and-drop reordering.
 */
export function useDocs() {
    const [docs, setDocs] = useState<Doc[]>([]);
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
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
        } catch (e: unknown) {
            setError(e instanceof Error ? e.message : String(e));
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

    const handleDragOver = useCallback(() => {
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

    return {
        docs,
        selectedId,
        selectedDoc,
        selectedPreviewUrl,
        error,
        setSelectedId,
        addPDFs,
        removeSelected,
        updatePageSpec,
        handleDragStart,
        handleDragOver,
        handleDrop,
    };
}
