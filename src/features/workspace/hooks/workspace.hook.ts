import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { onTauriEvent } from '@/infra/platform/events';
import type { RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { useFileDrop } from './file-drop.hook';
import { useFinalPages } from './final-pages.hook';
import { useSourceSession } from './source-session.hook';

export function useWorkspace({
    onFilesAdded,
    onDropError,
}: {
    onFilesAdded?: (ids: string[]) => void;
    onDropError?: (error: unknown) => void;
} = {}) {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [focusedSource, setFocusedSource] = useState<{
        fileId: string;
        target: SourceTarget;
        flashKey: number;
        flashTarget: 'picker' | 'final';
    } | null>(null);
    const finalPagesApi = useFinalPages();
    const { addAllPagesForFile, removePagesForFile, clearAllPages } = finalPagesApi;

    const handleSessionFilesAdded = useCallback(
        (addedFiles: SourceFile[]) => {
            for (const file of addedFiles) {
                addAllPagesForFile(file);
            }
            onFilesAdded?.(addedFiles.map((file) => file.id));
        },
        [addAllPagesForFile, onFilesAdded],
    );

    const handleSessionFileRemoved = useCallback(
        (file: SourceFile | null) => {
            if (!file) return;
            removePagesForFile(file.id);
        },
        [removePagesForFile],
    );

    const {
        files,
        editsByFile,
        addSourceFiles,
        openAndAddSourceFiles,
        removeSourceFile,
        clearSourceFiles,
        rotateSourcePage,
        reorderFiles,
        updateFilePageCount,
    } = useSourceSession({
        onFilesAdded: handleSessionFilesAdded,
        onFileRemoved: handleSessionFileRemoved,
    });

    const selectedFile = useMemo(
        () => files.find((file) => file.id === selectedId) ?? null,
        [files, selectedId],
    );

    const acceptFiles = useCallback(
        async (newFiles: typeof files) => {
            const addedFiles = addSourceFiles(newFiles);
            if (addedFiles.length) {
                setSelectedId((prev) => prev ?? addedFiles[0].id);
            }
            return addedFiles;
        },
        [addSourceFiles],
    );

    const addFiles = useCallback(async () => {
        const { files: addedFiles, skippedErrors } = await openAndAddSourceFiles();
        if (addedFiles.length) {
            setSelectedId((prev) => prev ?? addedFiles[0].id);
        }
        return { files: addedFiles, skippedErrors };
    }, [openAndAddSourceFiles]);

    const selectFile = useCallback((id: string) => {
        setSelectedId(id);
        setFocusedSource(null);
    }, []);

    const removeFile = useCallback(
        (id: string) => {
            if (id === selectedId) {
                const remaining = files.filter((file) => file.id !== id);
                setSelectedId(remaining.length ? remaining[0].id : null);
            }
            setFocusedSource((prev) => (prev?.fileId === id ? null : prev));
            removeSourceFile(id);
        },
        [files, removeSourceFile, selectedId],
    );

    const clearAllFiles = useCallback(() => {
        if (!files.length) return;
        setSelectedId(null);
        setFocusedSource(null);
        clearAllPages();
        clearSourceFiles();
    }, [clearAllPages, clearSourceFiles, files.length]);

    const rotatePage = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            await rotateSourcePage(fileId, target, direction);
        },
        [rotateSourcePage],
    );

    const selectIfNone = useCallback((id: string) => {
        setSelectedId((prev) => prev ?? id);
    }, []);

    const focusSource = useCallback(
        (fileId: string, target: SourceTarget, flashTarget: 'picker' | 'final') => {
            setSelectedId(fileId);
            setFocusedSource({ fileId, target, flashKey: Date.now(), flashTarget });
        },
        [],
    );

    const focusFinalPageSource = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSource(fileId, target, 'picker');
        },
        [focusSource],
    );

    const focusFinalPageInDocument = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSource(fileId, target, 'final');
        },
        [focusSource],
    );

    const handleDropError = useCallback(
        (error: unknown) => {
            onDropError?.(error);
        },
        [onDropError],
    );

    // Refs to access latest values inside stable event listeners.
    const filesRef = useRef(files);
    const addAllPagesForFileRef = useRef(addAllPagesForFile);
    const removeSourceFileRef = useRef(removeSourceFile);
    const removePagesForFileRef = useRef(removePagesForFile);
    const onDropErrorRef = useRef(onDropError);
    useLayoutEffect(() => {
        filesRef.current = files;
        addAllPagesForFileRef.current = addAllPagesForFile;
        removeSourceFileRef.current = removeSourceFile;
        onDropErrorRef.current = onDropError;
        removePagesForFileRef.current = removePagesForFile;
    });

    useEffect(() => {
        const unlisten = [
            onTauriEvent<{ id: string; pageCount: number }>('source-page-count', (e) => {
                const { id, pageCount } = e.payload;
                updateFilePageCount(id, pageCount);
                const file = filesRef.current.find((f) => f.id === id);
                if (file) addAllPagesForFileRef.current({ ...file, pageCount });
            }),
            onTauriEvent<{ id: string }>('source-page-count-error', (e) => {
                removeSourceFileRef.current(e.payload.id);
                removePagesForFileRef.current(e.payload.id); // explicit cleanup in case removeSourceFile's stale closure missed it
                onDropErrorRef.current?.(new Error('page_count_failed'));
            }),
        ];
        return () => {
            for (const fn of unlisten) fn();
        };
    }, [updateFilePageCount]); // updateFilePageCount is stable (no deps on useCallback), so this effect runs once; refs cover everything else

    const { isDragOver } = useFileDrop(acceptFiles, selectIfNone, handleDropError);

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
        focusFinalPageInDocument,
        reorderFiles,
        isDragOver,
        ...finalPagesApi,
    };
}
