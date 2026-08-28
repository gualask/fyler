import { type RefObject, useLayoutEffect, useRef } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import type { UseWorkspaceSourceEventsParams } from './workspace-source-events.types';

export type WorkspaceSourceEventRefs = {
    filesRef: RefObject<SourceFile[]>;
    setPdfPagesForFileRef: RefObject<UseWorkspaceSourceEventsParams['setPdfPagesForFile']>;
};

export function useWorkspaceSourceEventRefs({
    files,
    setPdfPagesForFile,
}: Pick<UseWorkspaceSourceEventsParams, 'files' | 'setPdfPagesForFile'>): WorkspaceSourceEventRefs {
    const filesRef = useRef(files);
    const setPdfPagesForFileRef = useRef(setPdfPagesForFile);

    useLayoutEffect(() => {
        filesRef.current = files;
        setPdfPagesForFileRef.current = setPdfPagesForFile;
    }, [files, setPdfPagesForFile]);

    return {
        filesRef,
        setPdfPagesForFileRef,
    };
}
