import { useCallback } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import { createWorkspaceFilesAddedEvent } from './workspace-files-added-event';
import type { WorkspaceSourceEventRefs } from './workspace-source-event-refs.hook';
import type { UseWorkspaceSourceEventsParams } from './workspace-source-events.types';

function pdfPageNumbers(pageCount: number): number[] {
    return Array.from({ length: pageCount }, (_, index) => index + 1);
}

function appendTrackedFiles(currentFiles: SourceFile[], addedFiles: SourceFile[]): SourceFile[] {
    if (!addedFiles.length) return currentFiles;

    const filesById = new Map(currentFiles.map((file) => [file.id, file]));
    for (const file of addedFiles) {
        filesById.set(file.id, file);
    }
    return Array.from(filesById.values());
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
    const { filesRef, setPdfPagesForFileRef } = refs;

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
                }
            }

            if (filesAddedEvent) {
                onFilesAdded?.(filesAddedEvent);
            }
        },
        [addAllPagesForFile, filesRef, onFilesAdded, setPdfPagesForFileRef],
    );

    const handleSessionFileRemoved = useCallback(
        (file: SourceFile | null) => {
            if (!file) return;
            filesRef.current = filesRef.current.filter((entry) => entry.id !== file.id);
            removePagesForFile(file.id);
        },
        [filesRef, removePagesForFile],
    );

    const handleSessionFilesCleared = useCallback(() => {
        filesRef.current = [];
    }, [filesRef]);

    return {
        handleSessionFilesAdded,
        handleSessionFileRemoved,
        handleSessionFilesCleared,
    };
}
