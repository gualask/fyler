import { type Dispatch, useCallback } from 'react';
import type { OpenFilesResult, SourceFile } from '@/shared/domain';
import type { WorkspaceUiAction } from '../../state/workspace-ui.reducer';

export function useWorkspaceImportActions({
    dispatchUi,
    addSourceFiles,
    openSourceFiles,
    resolveImportResult,
    handleSessionFilesAdded,
}: {
    dispatchUi: Dispatch<WorkspaceUiAction>;
    addSourceFiles: (newFiles: SourceFile[]) => SourceFile[];
    openSourceFiles: () => Promise<OpenFilesResult>;
    resolveImportResult: (result: OpenFilesResult) => Promise<SourceFile[]>;
    handleSessionFilesAdded: (addedFiles: SourceFile[]) => void;
}) {
    const applySelectionAfterAdd = useCallback(
        (addedFiles: SourceFile[]) => {
            dispatchUi({ type: 'files-added', files: addedFiles });
        },
        [dispatchUi],
    );

    const commitImportedFiles = useCallback(
        (newFiles: SourceFile[]) => {
            const addedFiles = addSourceFiles(newFiles);
            handleSessionFilesAdded(addedFiles);
            applySelectionAfterAdd(addedFiles);
            return addedFiles;
        },
        [addSourceFiles, applySelectionAfterAdd, handleSessionFilesAdded],
    );

    const acceptFiles = useCallback(
        async (result: OpenFilesResult) => {
            const resolvedFiles = await resolveImportResult(result);
            return commitImportedFiles(resolvedFiles);
        },
        [commitImportedFiles, resolveImportResult],
    );

    const addFiles = useCallback(
        async ({ onImportReady }: { onImportReady?: () => void } = {}) => {
            const result = await openSourceFiles();
            onImportReady?.();
            const addedFiles = await acceptFiles(result);
            return { files: addedFiles, skippedErrors: result.skippedErrors };
        },
        [acceptFiles, openSourceFiles],
    );

    return {
        acceptFiles,
        addFiles,
    };
}
