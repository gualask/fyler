import { useCallback, useMemo, useState } from 'react';
import { getPDFPreviewUrl, openPDFsDialog, rotatePdfPage } from '../platform';
import { useDocList } from './useDocList';
import { useDragDrop, type DragHandlers } from './useDragDrop';
import { useFileDrop } from './useFileDrop';

export type { DragHandlers };

/**
 * Composes useDocList + useDragDrop, adds selection and preview URL.
 * Exposes the full API consumed by App.
 */
export function useDocs() {
    const { docs, addDocs, removeDoc, updatePageSpec, updateDocPath, reorderDocs } = useDocList();
    const [selectedId, setSelectedId] = useState<string | null>(null);

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
        const newDocs = await openPDFsDialog();
        if (newDocs.length === 0) return;
        addDocs(newDocs);
        setSelectedId((prev) => prev ?? newDocs[0].id);
    }, [addDocs]);

    const removeSelected = useCallback(() => {
        if (!selectedId) return;
        const remaining = docs.filter((d) => d.id !== selectedId);
        setSelectedId(remaining.length ? remaining[0].id : null);
        removeDoc(selectedId);
    }, [selectedId, docs, removeDoc]);

    const rotatePage = useCallback(
        async (pageNum: number, angle: number) => {
            if (!selectedDoc) return;
            const newPath = await rotatePdfPage(selectedDoc.path, pageNum, angle);
            updateDocPath(selectedDoc.id, newPath);
        },
        [selectedDoc, updateDocPath],
    );

    const selectIfNone = useCallback(
        (id: string) => setSelectedId((prev) => prev ?? id),
        [],
    );

    const dragHandlers = useDragDrop(reorderDocs);
    const { isDragOver } = useFileDrop(addDocs, selectIfNone);

    return {
        docs,
        selectedId,
        selectedDoc,
        selectedPreviewUrl,
        setSelectedId,
        addPDFs,
        removeSelected,
        updatePageSpec,
        dragHandlers,
        rotatePage,
        isDragOver,
    };
}
