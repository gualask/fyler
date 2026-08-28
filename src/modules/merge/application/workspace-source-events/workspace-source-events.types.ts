import type { SourceFile } from '@/capabilities/document-sources';

export interface WorkspaceFilesAddedEvent {
    ids: string[];
    wasWorkspaceEmpty: boolean;
}

export interface UseWorkspaceSourceEventsParams {
    files: SourceFile[];
    setPdfPagesForFile: (fileId: string, pages: number[]) => void;
    removePagesForFile: (fileId: string) => void;
    addAllPagesForFile: (file: SourceFile) => void;
    onFilesAdded?: (event: WorkspaceFilesAddedEvent) => void;
}
