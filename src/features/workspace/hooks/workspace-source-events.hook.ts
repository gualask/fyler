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
    onFilesAdded?: (ids: string[]) => void;
    onDropError?: (error: unknown) => void;
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

    const handleSessionFilesAdded = useCallback(
        (addedFiles: SourceFile[]) => {
            for (const file of addedFiles) {
                if (file.kind === 'image') {
                    addAllPagesForFile(file);
                    continue;
                }

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

    useEffect(() => {
        const unlisten = [
            onTauriEvent<{ id: string; pageCount: number }>('source-page-count', (e) => {
                const { id, pageCount } = e.payload;
                updateFilePageCountRef.current(id, pageCount);
                setPdfPagesForFileRef.current(
                    id,
                    Array.from({ length: pageCount }, (_, i) => i + 1),
                );

                if (!filesRef.current.some((file) => file.id === id)) {
                    pendingPageCountsRef.current.set(id, pageCount);
                }
            }),
            onTauriEvent<{ id: string }>('source-page-count-error', (e) => {
                pendingPageCountsRef.current.delete(e.payload.id);
                const failedFile = filesRef.current.find((file) => file.id === e.payload.id);
                removeSourceFileRef.current(e.payload.id);
                removePagesForFileRef.current(e.payload.id);
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
    }, []);

    return {
        handleSessionFilesAdded,
        handleSessionFileRemoved,
    };
}
