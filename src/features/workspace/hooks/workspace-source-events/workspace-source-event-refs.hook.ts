import { type RefObject, useLayoutEffect, useRef } from 'react';
import type { SourceFile } from '@/shared/domain';
import type { UseWorkspaceSourceEventsParams } from './workspace-source-events.types';

export type WorkspaceSourceEventRefs = {
    pendingPageCountsRef: RefObject<Map<string, number>>;
    filesRef: RefObject<SourceFile[]>;
    updateFilePageCountRef: RefObject<UseWorkspaceSourceEventsParams['updateFilePageCount']>;
    setPdfPagesForFileRef: RefObject<UseWorkspaceSourceEventsParams['setPdfPagesForFile']>;
    removeSourceFileRef: RefObject<UseWorkspaceSourceEventsParams['removeSourceFile']>;
    removePagesForFileRef: RefObject<UseWorkspaceSourceEventsParams['removePagesForFile']>;
    onDropErrorRef: RefObject<UseWorkspaceSourceEventsParams['onDropError']>;
};

export function useWorkspaceSourceEventRefs({
    files,
    updateFilePageCount,
    setPdfPagesForFile,
    removeSourceFile,
    removePagesForFile,
    onDropError,
}: Pick<
    UseWorkspaceSourceEventsParams,
    | 'files'
    | 'updateFilePageCount'
    | 'setPdfPagesForFile'
    | 'removeSourceFile'
    | 'removePagesForFile'
    | 'onDropError'
>): WorkspaceSourceEventRefs {
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

    return {
        pendingPageCountsRef,
        filesRef,
        updateFilePageCountRef,
        setPdfPagesForFileRef,
        removeSourceFileRef,
        removePagesForFileRef,
        onDropErrorRef,
    };
}
