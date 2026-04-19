import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { onTauriEvent } from '@/infra/platform/events';
import type { RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { useFileDrop } from './file-drop.hook';
import { useFileList } from './file-list.hook';
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
    const { addAllPagesForFile, setPdfPagesForFile, removePagesForFile, clearAllPages } =
        finalPagesApi;
    const fileList = useFileList();
    const { updateFilePageCount } = fileList;

    // source-page-count may fire before React commits the addToList state update (race on fast
    // PDFs / dialog path). This map holds those early page counts so handleSessionFilesAdded can
    // re-queue updateFilePageCount after addToList's setFiles, ensuring React applies them in order.
    const pendingPageCountsRef = useRef<Map<string, number>>(new Map());

    const handleSessionFilesAdded = useCallback(
        (addedFiles: SourceFile[]) => {
            for (const file of addedFiles) {
                if (file.kind === 'image') {
                    addAllPagesForFile(file);
                    continue;
                }
                // PDF pages are added by the source-page-count event handler. If that event
                // arrived before this file entered React state, drain the pending count now so
                // updateFilePageCount is queued after addToList's setFiles (correct batch order).
                const pendingCount = pendingPageCountsRef.current.get(file.id);
                if (pendingCount !== undefined) {
                    pendingPageCountsRef.current.delete(file.id);
                    updateFilePageCount(file.id, pendingCount);
                }
            }
            onFilesAdded?.(addedFiles.map((file) => file.id));
        },
        [addAllPagesForFile, onFilesAdded, updateFilePageCount],
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
    } = useSourceSession({
        fileList,
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
    const setPdfPagesForFileRef = useRef(setPdfPagesForFile);
    const removeSourceFileRef = useRef(removeSourceFile);
    const removePagesForFileRef = useRef(removePagesForFile);
    const onDropErrorRef = useRef(onDropError);
    useLayoutEffect(() => {
        filesRef.current = files;
        setPdfPagesForFileRef.current = setPdfPagesForFile;
        removeSourceFileRef.current = removeSourceFile;
        onDropErrorRef.current = onDropError;
        removePagesForFileRef.current = removePagesForFile;
    });

    useEffect(() => {
        const unlisten = [
            onTauriEvent<{ id: string; pageCount: number }>('source-page-count', (e) => {
                const { id, pageCount } = e.payload;
                updateFilePageCount(id, pageCount);
                setPdfPagesForFileRef.current(
                    id,
                    Array.from({ length: pageCount }, (_, i) => i + 1),
                );
                if (!filesRef.current.some((f) => f.id === id)) {
                    pendingPageCountsRef.current.set(id, pageCount);
                }
            }),
            onTauriEvent<{ id: string }>('source-page-count-error', (e) => {
                pendingPageCountsRef.current.delete(e.payload.id);
                const failedFile = filesRef.current.find((file) => file.id === e.payload.id);
                removeSourceFileRef.current(e.payload.id);
                removePagesForFileRef.current(e.payload.id); // explicit cleanup in case removeSourceFile's stale closure missed it
                onDropErrorRef.current?.(
                    failedFile
                        ? { code: 'open_pdf_failed', meta: { name: failedFile.name } }
                        : new Error('page_count_failed'),
                );
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
