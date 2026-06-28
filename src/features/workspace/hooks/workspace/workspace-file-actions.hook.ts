import { type Dispatch, useCallback } from 'react';
import type { RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import type { WorkspaceUiAction } from '../../state/workspace-ui.reducer';

export function useWorkspaceFileActions({
    files,
    dispatchUi,
    handleSessionFileRemoved,
    handleSessionFilesCleared,
    removeSourceFile,
    clearSourceFiles,
    clearAllPages,
    rotateSourcePage,
}: {
    files: SourceFile[];
    dispatchUi: Dispatch<WorkspaceUiAction>;
    handleSessionFileRemoved: (file: SourceFile | null) => void;
    handleSessionFilesCleared: () => void;
    removeSourceFile: (id: string) => SourceFile | null;
    clearSourceFiles: () => void;
    clearAllPages: () => void;
    rotateSourcePage: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => Promise<void>;
}) {
    const selectFile = useCallback(
        (id: string) => {
            dispatchUi({ type: 'file-selected', fileId: id });
        },
        [dispatchUi],
    );

    const removeFile = useCallback(
        (id: string) => {
            const remainingIds = files.filter((file) => file.id !== id).map((file) => file.id);
            dispatchUi({ type: 'file-removed', fileId: id, remainingIds });
            handleSessionFileRemoved(removeSourceFile(id));
        },
        [dispatchUi, files, handleSessionFileRemoved, removeSourceFile],
    );

    const removeFiles = useCallback(
        (ids: readonly string[]) => {
            const idsToRemove = new Set(ids);
            if (idsToRemove.size === 0) return;

            const existingIds = files
                .filter((file) => idsToRemove.has(file.id))
                .map((file) => file.id);
            if (existingIds.length === 0) return;

            const remainingIds = files
                .filter((file) => !idsToRemove.has(file.id))
                .map((file) => file.id);

            dispatchUi({ type: 'files-removed', fileIds: existingIds, remainingIds });
            for (const id of existingIds) {
                handleSessionFileRemoved(removeSourceFile(id));
            }
        },
        [dispatchUi, files, handleSessionFileRemoved, removeSourceFile],
    );

    const clearAllFiles = useCallback(() => {
        if (!files.length) return;
        handleSessionFilesCleared();
        dispatchUi({ type: 'cleared' });
        clearAllPages();
        clearSourceFiles();
    }, [clearAllPages, clearSourceFiles, dispatchUi, files.length, handleSessionFilesCleared]);

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
