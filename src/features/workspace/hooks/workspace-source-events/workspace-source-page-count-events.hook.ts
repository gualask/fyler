import { useCallback, useEffect } from 'react';
import {
    handleSourcePageCount,
    pageCountErrorCode,
    subscribeToSourcePageCountEvents,
} from './page-count-events';
import type { WorkspaceSourceEventRefs } from './workspace-source-event-refs.hook';
import type {
    SourcePageCountErrorPayload,
    SourcePageCountPayload,
} from './workspace-source-events.types';

export function useWorkspaceSourcePageCountEvents({
    pendingPageCountsRef,
    filesRef,
    updateFilePageCountRef,
    setPdfPagesForFileRef,
    removeSourceFileRef,
    removePagesForFileRef,
    onDropErrorRef,
}: WorkspaceSourceEventRefs) {
    const handlePageCountError = useCallback(
        (fileId: string, reason?: string) => {
            pendingPageCountsRef.current.delete(fileId);
            const failedFile = filesRef.current.find((file) => file.id === fileId);
            removeSourceFileRef.current(fileId);
            removePagesForFileRef.current(fileId);
            onDropErrorRef.current?.(
                failedFile
                    ? { code: pageCountErrorCode(reason), meta: { name: failedFile.name } }
                    : new Error('page_count_failed'),
            );
        },
        [
            filesRef,
            onDropErrorRef,
            pendingPageCountsRef,
            removePagesForFileRef,
            removeSourceFileRef,
        ],
    );

    const handlePageCount = useCallback(
        ({ id, pageCount }: SourcePageCountPayload) => {
            handleSourcePageCount({
                fileId: id,
                pageCount,
                files: filesRef.current,
                pendingPageCounts: pendingPageCountsRef.current,
                updateFilePageCount: updateFilePageCountRef.current,
                setPdfPagesForFile: setPdfPagesForFileRef.current,
            });
        },
        [filesRef, pendingPageCountsRef, setPdfPagesForFileRef, updateFilePageCountRef],
    );

    const handlePageCountErrorEvent = useCallback(
        ({ id, reason }: SourcePageCountErrorPayload) => {
            handlePageCountError(id, reason);
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
}
