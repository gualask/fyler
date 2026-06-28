import { useCallback } from 'react';
import type { SourceFile } from '@/shared/domain';
import { applyResolvedPageCount, pdfPageNumbers } from './page-count-events';
import { createWorkspaceFilesAddedEvent } from './workspace-files-added-event';
import type { WorkspaceSourceEventRefs } from './workspace-source-event-refs.hook';
import type { UseWorkspaceSourceEventsParams } from './workspace-source-events.types';

function appendTrackedFiles(currentFiles: SourceFile[], addedFiles: SourceFile[]): SourceFile[] {
    if (!addedFiles.length) return currentFiles;

    const filesById = new Map(currentFiles.map((file) => [file.id, file]));
    for (const file of addedFiles) {
        filesById.set(file.id, file);
    }
    return Array.from(filesById.values());
}

function useApplyPendingPageCount({
    pendingPageCountsRef,
    updateFilePageCountRef,
    setPdfPagesForFileRef,
}: WorkspaceSourceEventRefs) {
    return useCallback(
        (fileId: string) => {
            const pendingCount = pendingPageCountsRef.current.get(fileId);
            if (pendingCount === undefined) return;

            pendingPageCountsRef.current.delete(fileId);
            applyResolvedPageCount({
                fileId,
                pageCount: pendingCount,
                updateFilePageCount: updateFilePageCountRef.current,
                setPdfPagesForFile: setPdfPagesForFileRef.current,
            });
        },
        [pendingPageCountsRef, setPdfPagesForFileRef, updateFilePageCountRef],
    );
}

export function useSessionFileEvents({
    refs,
    addAllPagesForFile,
    removePagesForFile,
    onFilesAdded,
}: {
    refs: WorkspaceSourceEventRefs;
    addAllPagesForFile: UseWorkspaceSourceEventsParams['addAllPagesForFile'];
    removePagesForFile: UseWorkspaceSourceEventsParams['removePagesForFile'];
    onFilesAdded: UseWorkspaceSourceEventsParams['onFilesAdded'];
}) {
    const { pendingPageCountsRef, filesRef, setPdfPagesForFileRef } = refs;
    const applyPendingPageCount = useApplyPendingPageCount(refs);

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

                if (file.pageCount !== null) {
                    setPdfPagesForFileRef.current(file.id, pdfPageNumbers(file.pageCount));
                    continue;
                }

                applyPendingPageCount(file.id);
            }

            if (filesAddedEvent) {
                onFilesAdded?.(filesAddedEvent);
            }
        },
        [addAllPagesForFile, applyPendingPageCount, filesRef, onFilesAdded, setPdfPagesForFileRef],
    );

    const handleSessionFileRemoved = useCallback(
        (file: SourceFile | null) => {
            if (!file) return;
            pendingPageCountsRef.current.delete(file.id);
            filesRef.current = filesRef.current.filter((entry) => entry.id !== file.id);
            removePagesForFile(file.id);
        },
        [filesRef, pendingPageCountsRef, removePagesForFile],
    );

    const handleSessionFilesCleared = useCallback(() => {
        pendingPageCountsRef.current.clear();
        filesRef.current = [];
    }, [filesRef, pendingPageCountsRef]);

    return {
        handleSessionFilesAdded,
        handleSessionFileRemoved,
        handleSessionFilesCleared,
    };
}
