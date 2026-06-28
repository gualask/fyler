import { useSessionFileEvents } from './session-file-events.hook';
import { useWorkspaceSourceEventRefs } from './workspace-source-event-refs.hook';
import type { UseWorkspaceSourceEventsParams } from './workspace-source-events.types';
import { useWorkspaceSourcePageCountEvents } from './workspace-source-page-count-events.hook';

export { applyResolvedPageCount, handleSourcePageCount } from './page-count-events';
export { createWorkspaceFilesAddedEvent } from './workspace-files-added-event';
export type { WorkspaceFilesAddedEvent } from './workspace-source-events.types';

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
    // Keep supporting native page-count events for compatibility with any queued legacy work.
    // Current imports usually arrive with pageCount already set.
    const refs = useWorkspaceSourceEventRefs({
        files,
        updateFilePageCount,
        setPdfPagesForFile,
        removeSourceFile,
        removePagesForFile,
        onDropError,
    });
    useWorkspaceSourcePageCountEvents(refs);

    return useSessionFileEvents({
        refs,
        addAllPagesForFile,
        removePagesForFile,
        onFilesAdded,
    });
}
