import { useCallback } from 'react';
import type { OpenFilesResult, SourceFile } from '@/shared/domain';

export function useWorkspaceImportActions({
    applyFilesAddedUi,
    addSourceFiles,
    openSourceFiles,
    resolveImportResult,
    handleSessionFilesAdded,
}: {
    applyFilesAddedUi: (files: Pick<SourceFile, 'id' | 'kind'>[]) => void;
    addSourceFiles: (newFiles: SourceFile[]) => SourceFile[];
    openSourceFiles: () => Promise<OpenFilesResult>;
    resolveImportResult: (result: OpenFilesResult) => Promise<SourceFile[]>;
    handleSessionFilesAdded: (addedFiles: SourceFile[]) => void;
}) {
    const applySelectionAfterAdd = useCallback(
        (addedFiles: SourceFile[]) => {
            applyFilesAddedUi(addedFiles);
        },
        [applyFilesAddedUi],
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
