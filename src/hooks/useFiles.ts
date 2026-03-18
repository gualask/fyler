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
    const [focusedSource, setFocusedSource] = useState<{ fileId: string; pageNum: number; flashKey: number } | null>(null);
    const finalPagesApi = useFinalPages();
    const { addAllPagesForFile, removePagesForFile, clearAllPages } = finalPagesApi;

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
        clearSourceFiles,
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
        if (!addedFiles.length) return [];
        setSelectedId((prev) => prev ?? addedFiles[0].id);
        return addedFiles;
    }, [openAndAddSourceFiles]);

    const selectFile = useCallback((id: string) => {
        setSelectedId(id);
        setFocusedSource(null);
    }, []);

    const removeFile = useCallback((id: string) => {
        if (id === selectedId) {
            const remaining = files.filter((file) => file.id !== id);
            setSelectedId(remaining.length ? remaining[0].id : null);
        }
        setFocusedSource((prev) => (prev?.fileId === id ? null : prev));
        removeSourceFile(id);
    }, [files, removeSourceFile, selectedId]);

    const clearAllFiles = useCallback(() => {
        if (!files.length) return;
        setSelectedId(null);
        setFocusedSource(null);
        clearAllPages();
        clearSourceFiles();
    }, [clearAllPages, clearSourceFiles, files.length]);

    const rotatePage = useCallback(async (fileId: string, pageNum: number, direction: RotationDirection) => {
        await rotateSourcePage(fileId, pageNum, direction);
    }, [rotateSourcePage]);

    const selectIfNone = useCallback((id: string) => {
        setSelectedId((prev) => prev ?? id);
    }, []);

    const focusFinalPageSource = useCallback((fileId: string, pageNum: number) => {
        setSelectedId(fileId);
        setFocusedSource({ fileId, pageNum, flashKey: Date.now() });
    }, []);

    const { isDragOver } = useFileDrop(acceptFiles, selectIfNone);

    return {
        files,
        editsByFile,
        selectedId,
        selectedFile,
        selectFile,
        focusedSource,
        addFiles,
        removeFile,
        clearAllFiles,
        rotatePage,
        focusFinalPageSource,
        reorderFiles,
        isDragOver,
        ...finalPagesApi,
    };
}
