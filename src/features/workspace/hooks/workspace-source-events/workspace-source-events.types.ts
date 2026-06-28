import type { SourceFile } from '@/shared/domain';

export interface WorkspaceFilesAddedEvent {
    ids: string[];
    wasWorkspaceEmpty: boolean;
}

export interface UseWorkspaceSourceEventsParams {
    files: SourceFile[];
    updateFilePageCount: (id: string, count: number) => void;
    setPdfPagesForFile: (fileId: string, pages: number[]) => void;
    removeSourceFile: (id: string) => SourceFile | null;
    removePagesForFile: (fileId: string) => void;
    addAllPagesForFile: (file: SourceFile) => void;
    onFilesAdded?: (event: WorkspaceFilesAddedEvent) => void;
    onDropError?: (error: unknown) => void;
}

export interface SourcePageCountPayload {
    id: string;
    pageCount: number;
}

export interface SourcePageCountErrorPayload {
    id: string;
    reason?: string;
}
