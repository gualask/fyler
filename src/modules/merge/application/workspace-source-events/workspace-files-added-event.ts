import type { SourceFile } from '@/capabilities/document-sources';
import type { WorkspaceFilesAddedEvent } from './workspace-source-events.types';

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
