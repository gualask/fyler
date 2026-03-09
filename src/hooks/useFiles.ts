import { useCallback, useMemo, useState } from 'react';

import type { RotationDirection } from '../fileEdits';
import type { SourceFile } from '../domain';
import { useFileDrop } from './useFileDrop';
import { useFinalPages } from './useFinalPages';
import { useSourceSession } from './useSourceSession';

export function useFiles({
    onFilesAdded,
}: {
    onFilesAdded?: (ids: string[]) => void;
} = {}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const finalPagesApi = useFinalPages();
    const { addAllPagesForFile, removePagesForFile } = finalPagesApi;

    const handleSessionFilesAdded = useCallback((addedFiles: SourceFile[]) => {
        for (const file of addedFiles) {
            addAllPagesForFile(file);
        }
        onFilesAdded?.(addedFiles.map((file) => file.id));
    }, [addAllPagesForFile, onFilesAdded]);

    const handleSessionFileRemoved = useCallback((file: SourceFile | null) => {
        if (!file) return;
        removePagesForFile(file.id);
    }, [removePagesForFile]);

    const {
        files,
        editsByFile,
        addSourceFiles,
        openAndAddSourceFiles,
        removeSourceFile,
        rotateSourcePage,
        reorderFiles,
    } = useSourceSession({
        onFilesAdded: handleSessionFilesAdded,
        onFileRemoved: handleSessionFileRemoved,
    });

    const selectedFile = useMemo(
        () => files.find((file) => file.id === selectedId) ?? null,
        [files, selectedId],
    );

    const acceptFiles = useCallback(async (newFiles: typeof files) => {
        const addedFiles = addSourceFiles(newFiles);
        if (addedFiles.length) {
            setSelectedId((prev) => prev ?? addedFiles[0].id);
        }
        return addedFiles;
    }, [addSourceFiles]);

    const addFiles = useCallback(async () => {
        const addedFiles = await openAndAddSourceFiles();
        if (!addedFiles.length) return;
        setSelectedId((prev) => prev ?? addedFiles[0].id);
    }, [openAndAddSourceFiles]);

    const removeFile = useCallback((id: string) => {
        if (id === selectedId) {
            const remaining = files.filter((file) => file.id !== id);
            setSelectedId(remaining.length ? remaining[0].id : null);
        }
        removeSourceFile(id);
    }, [files, removeSourceFile, selectedId]);

    const rotatePage = useCallback(async (fileId: string, pageNum: number, direction: RotationDirection) => {
        await rotateSourcePage(fileId, pageNum, direction);
    }, [rotateSourcePage]);

    const selectIfNone = useCallback((id: string) => {
        setSelectedId((prev) => prev ?? id);
    }, []);

    const { isDragOver } = useFileDrop(acceptFiles, selectIfNone);

    return {
        files,
        editsByFile,
        selectedId,
        selectedFile,
        setSelectedId,
        addFiles,
        removeFile,
        rotatePage,
        reorderFiles,
        isDragOver,
        ...finalPagesApi,
    };
}
