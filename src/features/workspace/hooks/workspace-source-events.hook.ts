import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';
import { onTauriEvent } from '@/infra/platform/events';
import type { SourceFile } from '@/shared/domain';

interface UseWorkspaceSourceEventsParams {
    files: SourceFile[];
    updateFilePageCount: (id: string, count: number) => void;
    setPdfPagesForFile: (fileId: string, pages: number[]) => void;
    removeSourceFile: (id: string) => SourceFile | null;
    removePagesForFile: (fileId: string) => void;
    addAllPagesForFile: (file: SourceFile) => void;
    onFilesAdded?: (event: WorkspaceFilesAddedEvent) => void;
    onDropError?: (error: unknown) => void;
}

export interface WorkspaceFilesAddedEvent {
    ids: string[];
    wasWorkspaceEmpty: boolean;
}

export function createWorkspaceFilesAddedEvent({
    currentFiles,
    addedFiles,
}: {
    currentFiles: readonly SourceFile[];
    addedFiles: readonly Pick<SourceFile, 'id'>[];
}): WorkspaceFilesAddedEvent | null {
    const ids = addedFiles.map((file) => file.id);
    if (ids.length === 0) return null;

    return {
        ids,
        wasWorkspaceEmpty: currentFiles.length === 0,
    };
}

interface SourcePageCountPayload {
    id: string;
    pageCount: number;
}

interface SourcePageCountErrorPayload {
    id: string;
}

interface SourcePageCountEventHandlers {
    onPageCount: (payload: SourcePageCountPayload) => void;
    onPageCountError: (payload: SourcePageCountErrorPayload) => void;
}

function subscribeToSourcePageCountEvents({
    onPageCount,
    onPageCountError,
}: SourcePageCountEventHandlers): () => void {
    const unlistenPageCount = onTauriEvent<SourcePageCountPayload>('source-page-count', (event) => {
        onPageCount(event.payload);
    });
    const unlistenPageCountError = onTauriEvent<SourcePageCountErrorPayload>(
        'source-page-count-error',
        (event) => {
            onPageCountError(event.payload);
        },
    );

    return () => {
        unlistenPageCount();
        unlistenPageCountError();
    };
}

function pdfPageNumbers(pageCount: number): number[] {
    return Array.from({ length: pageCount }, (_, i) => i + 1);
}

interface ApplyResolvedPageCountParams {
    fileId: string;
    pageCount: number;
    updateFilePageCount: (id: string, count: number) => void;
    setPdfPagesForFile: (fileId: string, pages: number[]) => void;
}

export function applyResolvedPageCount({
    fileId,
    pageCount,
    updateFilePageCount,
    setPdfPagesForFile,
}: ApplyResolvedPageCountParams) {
    updateFilePageCount(fileId, pageCount);
    setPdfPagesForFile(fileId, pdfPageNumbers(pageCount));
}

interface HandleSourcePageCountParams extends ApplyResolvedPageCountParams {
    files: SourceFile[];
    pendingPageCounts: Map<string, number>;
}

export function handleSourcePageCount({
    fileId,
    pageCount,
    files,
    pendingPageCounts,
    updateFilePageCount,
    setPdfPagesForFile,
}: HandleSourcePageCountParams): 'applied' | 'pending' {
    if (!files.some((file) => file.id === fileId)) {
        pendingPageCounts.set(fileId, pageCount);
        return 'pending';
    }

    applyResolvedPageCount({
        fileId,
        pageCount,
        updateFilePageCount,
        setPdfPagesForFile,
    });
    return 'applied';
}

function appendTrackedFiles(currentFiles: SourceFile[], addedFiles: SourceFile[]): SourceFile[] {
    if (!addedFiles.length) return currentFiles;

    const filesById = new Map(currentFiles.map((file) => [file.id, file]));
    for (const file of addedFiles) {
        filesById.set(file.id, file);
    }
    return Array.from(filesById.values());
}

export function useWorkspaceSourceEvents({
    files,
    updateFilePageCount,
    setPdfPagesForFile,
    removeSourceFile,
    removePagesForFile,
    addAllPagesForFile,
    onFilesAdded,
    onDropError,
}: UseWorkspaceSourceEventsParams) {
    // source-page-count may fire before React commits the addToList state update (race on fast
    // PDFs / dialog path). This map holds those early page counts so handleSessionFilesAdded can
    // re-queue updateFilePageCount after the reducer adds the files, ensuring React applies them
    // in order.
    const pendingPageCountsRef = useRef<Map<string, number>>(new Map());
    const filesRef = useRef(files);
    const updateFilePageCountRef = useRef(updateFilePageCount);
    const setPdfPagesForFileRef = useRef(setPdfPagesForFile);
    const removeSourceFileRef = useRef(removeSourceFile);
    const removePagesForFileRef = useRef(removePagesForFile);
    const onDropErrorRef = useRef(onDropError);

    useLayoutEffect(() => {
        filesRef.current = files;
        updateFilePageCountRef.current = updateFilePageCount;
        setPdfPagesForFileRef.current = setPdfPagesForFile;
        removeSourceFileRef.current = removeSourceFile;
        removePagesForFileRef.current = removePagesForFile;
        onDropErrorRef.current = onDropError;
    }, [
        files,
        onDropError,
        removePagesForFile,
        removeSourceFile,
        setPdfPagesForFile,
        updateFilePageCount,
    ]);

    const applyPendingPageCount = useCallback((fileId: string) => {
        const pendingCount = pendingPageCountsRef.current.get(fileId);
        if (pendingCount === undefined) return;

        pendingPageCountsRef.current.delete(fileId);
        applyResolvedPageCount({
            fileId,
            pageCount: pendingCount,
            updateFilePageCount: updateFilePageCountRef.current,
            setPdfPagesForFile: setPdfPagesForFileRef.current,
        });
    }, []);

    const handleSessionFilesAdded = useCallback(
        (addedFiles: SourceFile[]) => {
            const filesAddedEvent = createWorkspaceFilesAddedEvent({
                currentFiles: filesRef.current,
                addedFiles,
            });
            filesRef.current = appendTrackedFiles(filesRef.current, addedFiles);

            for (const file of addedFiles) {
                if (file.kind === 'image') {
                    addAllPagesForFile(file);
                    continue;
                }

                applyPendingPageCount(file.id);
            }

            if (filesAddedEvent) {
                onFilesAdded?.(filesAddedEvent);
            }
        },
        [addAllPagesForFile, applyPendingPageCount, onFilesAdded],
    );

    const handleSessionFileRemoved = useCallback(
        (file: SourceFile | null) => {
            if (!file) return;
            pendingPageCountsRef.current.delete(file.id);
            filesRef.current = filesRef.current.filter((entry) => entry.id !== file.id);
            removePagesForFile(file.id);
        },
        [removePagesForFile],
    );

    const handleSessionFilesCleared = useCallback(() => {
        pendingPageCountsRef.current.clear();
        filesRef.current = [];
    }, []);

    const handlePageCountError = useCallback((fileId: string) => {
        pendingPageCountsRef.current.delete(fileId);
        const failedFile = filesRef.current.find((file) => file.id === fileId);
        removeSourceFileRef.current(fileId);
        removePagesForFileRef.current(fileId);
        onDropErrorRef.current?.(
            failedFile
                ? { code: 'open_pdf_failed', meta: { name: failedFile.name } }
                : new Error('page_count_failed'),
        );
    }, []);

    const handlePageCount = useCallback(({ id, pageCount }: SourcePageCountPayload) => {
        handleSourcePageCount({
            fileId: id,
            pageCount,
            files: filesRef.current,
            pendingPageCounts: pendingPageCountsRef.current,
            updateFilePageCount: updateFilePageCountRef.current,
            setPdfPagesForFile: setPdfPagesForFileRef.current,
        });
    }, []);

    const handlePageCountErrorEvent = useCallback(
        ({ id }: SourcePageCountErrorPayload) => {
            handlePageCountError(id);
        },
        [handlePageCountError],
    );

    useEffect(
        () =>
            subscribeToSourcePageCountEvents({
                onPageCount: handlePageCount,
                onPageCountError: handlePageCountErrorEvent,
            }),
        [handlePageCount, handlePageCountErrorEvent],
    );

    return {
        handleSessionFilesAdded,
        handleSessionFileRemoved,
        handleSessionFilesCleared,
    };
}
