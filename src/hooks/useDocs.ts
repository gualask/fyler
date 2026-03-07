import { useCallback, useMemo, useState } from 'react';
import { getPreviewUrl, openFilesDialog, rotatePdfPage } from '../platform';
import { useDocList } from './useDocList';
import { useFileDrop } from './useFileDrop';

/**
 * Composes useDocList + useFileDrop, adds selection and preview URL.
 * Exposes the full API consumed by App.
 */
export function useDocs() {
    const { docs, addDocs, removeDoc: removeDocFromList, updatePageSpec, updateDocPath, reorderDocs } = useDocList();
    const [selectedId, setSelectedId] = useState<string | null>(null);

    const selectedDoc = useMemo(
        () => docs.find((d) => d.id === selectedId) ?? null,
        [docs, selectedId],
    );

    const selectedPreviewUrl = useMemo(
        () => (selectedDoc ? getPreviewUrl(selectedDoc.path) : null),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [selectedDoc?.path],
    );

    const addFiles = useCallback(async () => {
        const newDocs = await openFilesDialog();
        if (newDocs.length === 0) return;
        addDocs(newDocs);
        setSelectedId((prev) => prev ?? newDocs[0].id);
    }, [addDocs]);

    const removeDoc = useCallback((id: string) => {
        if (id === selectedId) {
            const remaining = docs.filter((d) => d.id !== id);
            setSelectedId(remaining.length ? remaining[0].id : null);
        }
        removeDocFromList(id);
    }, [selectedId, docs, removeDocFromList]);

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

    const { isDragOver } = useFileDrop(addDocs, selectIfNone);

    return {
        docs,
        selectedId,
        selectedDoc,
        selectedPreviewUrl,
        setSelectedId,
        addFiles,
        removeDoc,
        updatePageSpec,
        reorderDocs,
        rotatePage,
        isDragOver,
    };
}
