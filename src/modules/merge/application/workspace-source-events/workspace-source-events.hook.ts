import { useSessionFileEvents } from './session-file-events.hook';
import { useWorkspaceSourceEventRefs } from './workspace-source-event-refs.hook';
import type { UseWorkspaceSourceEventsParams } from './workspace-source-events.types';

export function useWorkspaceSourceEvents({
    files,
    setPdfPagesForFile,
    removePagesForFile,
    addAllPagesForFile,
    onFilesAdded,
}: UseWorkspaceSourceEventsParams) {
    const refs = useWorkspaceSourceEventRefs({
        files,
        setPdfPagesForFile,
    });

    return useSessionFileEvents({
        refs,
        addAllPagesForFile,
        removePagesForFile,
        onFilesAdded,
    });
}
