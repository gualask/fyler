import { useCallback } from 'react';
import type { RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';

export function useWorkspaceFileActions({
    applyFileRemovedUi,
    applyFilesRemovedUi,
    clearUi,
    selectFile: selectFileState,
    handleSessionFileRemoved,
    handleSessionFilesCleared,
    removeSourceFile,
    removeSourceFiles,
    clearSourceFiles,
    clearAllPages,
    rotateSourcePage,
}: {
    applyFileRemovedUi: (fileId: string, remainingIds: string[]) => void;
    applyFilesRemovedUi: (fileIds: string[], remainingIds: string[]) => void;
    clearUi: () => void;
    selectFile: (fileId: string) => void;
    handleSessionFileRemoved: (file: SourceFile | null) => void;
    handleSessionFilesCleared: () => void;
    removeSourceFile: (id: string) => { removed: SourceFile | null; remainingIds: string[] };
    removeSourceFiles: (ids: readonly string[]) => {
        removedFiles: SourceFile[];
        remainingIds: string[];
    };
    clearSourceFiles: () => SourceFile[];
    clearAllPages: () => void;
    rotateSourcePage: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => Promise<void>;
}) {
    const selectFile = useCallback(
        (id: string) => {
            selectFileState(id);
        },
        [selectFileState],
    );

    const removeFile = useCallback(
        (id: string) => {
            const { removed, remainingIds } = removeSourceFile(id);
            if (!removed) return;
            applyFileRemovedUi(id, remainingIds);
            handleSessionFileRemoved(removed);
        },
        [applyFileRemovedUi, handleSessionFileRemoved, removeSourceFile],
    );

    const removeFiles = useCallback(
        (ids: readonly string[]) => {
            const { removedFiles, remainingIds } = removeSourceFiles(ids);
            if (!removedFiles.length) return;

            applyFilesRemovedUi(
                removedFiles.map((file) => file.id),
                remainingIds,
            );
            for (const file of removedFiles) {
                handleSessionFileRemoved(file);
            }
        },
        [applyFilesRemovedUi, handleSessionFileRemoved, removeSourceFiles],
    );

    const clearAllFiles = useCallback(() => {
        const removedFiles = clearSourceFiles();
        if (!removedFiles.length) return;
        handleSessionFilesCleared();
        clearUi();
        clearAllPages();
    }, [clearAllPages, clearSourceFiles, clearUi, handleSessionFilesCleared]);

    const rotatePage = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            await rotateSourcePage(fileId, target, direction);
        },
        [rotateSourcePage],
    );

    return {
        clearAllFiles,
        removeFile,
        removeFiles,
        rotatePage,
        selectFile,
    };
}
