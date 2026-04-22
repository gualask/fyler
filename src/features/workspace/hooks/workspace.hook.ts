import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef } from 'react';
import { onTauriEvent } from '@/infra/platform/events';
import type { RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { initialWorkspaceUiState, workspaceUiReducer } from '../state/workspace-ui.reducer';
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
    const [uiState, dispatchUi] = useReducer(workspaceUiReducer, initialWorkspaceUiState);
    const finalPagesApi = useFinalPages();
    const { addAllPagesForFile, setPdfPagesForFile, removePagesForFile, clearAllPages } =
        finalPagesApi;

    // source-page-count may fire before React commits the addToList state update (race on fast
    // PDFs / dialog path). This map holds those early page counts so handleSessionFilesAdded can
    // re-queue updateFilePageCount after the reducer adds the files, ensuring React applies them
    // in order.
    const pendingPageCountsRef = useRef<Map<string, number>>(new Map());
    const updateFilePageCountRef = useRef<(id: string, count: number) => void>(() => undefined);

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
                    updateFilePageCountRef.current(file.id, pendingCount);
                }
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
        () => files.find((file) => file.id === uiState.selectedId) ?? null,
        [files, uiState.selectedId],
    );

    const focusSource = useCallback(
        (fileId: string, target: SourceTarget, flashTarget: 'picker' | 'final') => {
            dispatchUi({
                type: 'source-focused',
                fileId,
                target,
                flashTarget,
            });
        },
        [],
    );

    const applySelectionAfterAdd = useCallback((addedFiles: typeof files) => {
        dispatchUi({ type: 'files-added', files: addedFiles });
    }, []);

    const acceptFiles = useCallback(
        async (newFiles: typeof files) => {
            const addedFiles = addSourceFiles(newFiles);
            applySelectionAfterAdd(addedFiles);
            return addedFiles;
        },
        [addSourceFiles, applySelectionAfterAdd],
    );

    const addFiles = useCallback(async () => {
        const { files: addedFiles, skippedErrors } = await openAndAddSourceFiles();
        applySelectionAfterAdd(addedFiles);
        return { files: addedFiles, skippedErrors };
    }, [applySelectionAfterAdd, openAndAddSourceFiles]);

    const selectFile = useCallback((id: string) => {
        dispatchUi({ type: 'file-selected', fileId: id });
    }, []);

    const removeFile = useCallback(
        (id: string) => {
            const remainingIds = files.filter((file) => file.id !== id).map((file) => file.id);
            dispatchUi({ type: 'file-removed', fileId: id, remainingIds });
            removeSourceFile(id);
        },
        [files, removeSourceFile],
    );

    const clearAllFiles = useCallback(() => {
        if (!files.length) return;
        dispatchUi({ type: 'cleared' });
        clearAllPages();
        clearSourceFiles();
    }, [clearAllPages, clearSourceFiles, files.length]);

    const rotatePage = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            await rotateSourcePage(fileId, target, direction);
        },
        [rotateSourcePage],
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
        updateFilePageCountRef.current = updateFilePageCount;
        setPdfPagesForFileRef.current = setPdfPagesForFile;
        removeSourceFileRef.current = removeSourceFile;
        onDropErrorRef.current = onDropError;
        removePagesForFileRef.current = removePagesForFile;
    }, [
        files,
        onDropError,
        removePagesForFile,
        removeSourceFile,
        setPdfPagesForFile,
        updateFilePageCount,
    ]);

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

    const { isDragOver } = useFileDrop(acceptFiles, handleDropError);

    return {
        files,
        editsByFile,
        selectedId: uiState.selectedId,
        selectedFileScrollKey: uiState.selectedFileScrollKey,
        selectedFile,
        selectFile,
        focusedSource: uiState.focusedSource,
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
