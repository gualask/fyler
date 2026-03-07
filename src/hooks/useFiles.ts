import { useCallback, useMemo, useState } from 'react';
import { getPreviewUrl, openFilesDialog } from '../platform';
import { useFileList } from './useFileList';
import { useFileDrop } from './useFileDrop';
import { useFinalPages } from './useFinalPages';
import { useThumbnailCache } from './useThumbnailCache';
import type { SourceFile } from '../domain';

/**
 * Composes useFileList + useFileDrop + useFinalPages.
 * Exposes the full API consumed by App.
 */
export function useFiles() {
    const { files, addFiles: addToList, removeFile: removeFileFromList, reorderFiles } = useFileList();
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const { requestThumbnails } = useThumbnailCache();
    const finalPagesApi = useFinalPages();
    const { addAllPagesForFile, removePagesForFile } = finalPagesApi;

    const selectedFile = useMemo(
        () => files.find((f) => f.id === selectedId) ?? null,
        [files, selectedId],
    );

    const handleNewFiles = useCallback(
        (newFiles: SourceFile[]) => {
            addToList(newFiles);
            for (const file of newFiles) {
                addAllPagesForFile(file);
                if (file.kind === 'pdf') {
                    requestThumbnails(getPreviewUrl(file.path), file.pageCount);
                }
            }
        },
        [addToList, addAllPagesForFile, requestThumbnails],
    );

    const addFiles = useCallback(async () => {
        const newFiles = await openFilesDialog();
        if (!newFiles.length) return;
        handleNewFiles(newFiles);
        setSelectedId((prev) => prev ?? newFiles[0].id);
    }, [handleNewFiles]);

    const removeFile = useCallback(
        (id: string) => {
            if (id === selectedId) {
                const remaining = files.filter((f) => f.id !== id);
                setSelectedId(remaining.length ? remaining[0].id : null);
            }
            removeFileFromList(id);
            removePagesForFile(id);
        },
        [selectedId, files, removeFileFromList, removePagesForFile],
    );

    const selectIfNone = useCallback(
        (id: string) => setSelectedId((prev) => prev ?? id),
        [],
    );

    const { isDragOver } = useFileDrop(handleNewFiles, selectIfNone);

    return {
        files,
        selectedId,
        selectedFile,
        setSelectedId,
        addFiles,
        removeFile,
        reorderFiles,
        isDragOver,
        ...finalPagesApi,
    };
}
