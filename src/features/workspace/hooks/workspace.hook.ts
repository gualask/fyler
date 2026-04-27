import { useCallback, useMemo, useReducer } from 'react';
import type { RotationDirection, SourceTarget } from '@/shared/domain';
import { initialWorkspaceUiState, workspaceUiReducer } from '../state/workspace-ui.reducer';
import { useFileDrop } from './file-drop.hook';
import { useFinalPages } from './final-pages.hook';
import { useSourceSession } from './source-session.hook';
import {
    useWorkspaceSourceEvents,
    type WorkspaceFilesAddedEvent,
} from './workspace-source-events.hook';

export function useWorkspace({
    onFilesAdded,
    onDropError,
}: {
    onFilesAdded?: (event: WorkspaceFilesAddedEvent) => void;
    onDropError?: (error: unknown) => void;
} = {}) {
    const [uiState, dispatchUi] = useReducer(workspaceUiReducer, initialWorkspaceUiState);
    const finalPagesApi = useFinalPages();
    const { addAllPagesForFile, setPdfPagesForFile, removePagesForFile, clearAllPages } =
        finalPagesApi;

    const {
        files,
        editsByFile,
        addSourceFiles,
        openAndAddSourceFiles,
        removeSourceFile,
        clearSourceFiles,
        rotateSourcePage,
        reorderFiles,
        updateFilePageCount,
    } = useSourceSession();

    const { handleSessionFilesAdded, handleSessionFileRemoved, handleSessionFilesCleared } =
        useWorkspaceSourceEvents({
            files,
            updateFilePageCount,
            setPdfPagesForFile,
            removeSourceFile,
            removePagesForFile,
            addAllPagesForFile,
            onFilesAdded,
            onDropError,
        });

    const selectedFile = useMemo(
        () => files.find((file) => file.id === uiState.selectedId) ?? null,
        [files, uiState.selectedId],
    );

    const focusSource = useCallback(
        (fileId: string, target: SourceTarget, flashTarget: 'picker' | 'final') => {
            dispatchUi({
                type: 'source-focused',
                fileId,
                target,
                flashTarget,
            });
        },
        [],
    );

    const applySelectionAfterAdd = useCallback((addedFiles: typeof files) => {
        dispatchUi({ type: 'files-added', files: addedFiles });
    }, []);

    const acceptFiles = useCallback(
        async (newFiles: typeof files) => {
            const addedFiles = addSourceFiles(newFiles);
            handleSessionFilesAdded(addedFiles);
            applySelectionAfterAdd(addedFiles);
            return addedFiles;
        },
        [addSourceFiles, applySelectionAfterAdd, handleSessionFilesAdded],
    );

    const addFiles = useCallback(async () => {
        const { files: addedFiles, skippedErrors } = await openAndAddSourceFiles();
        handleSessionFilesAdded(addedFiles);
        applySelectionAfterAdd(addedFiles);
        return { files: addedFiles, skippedErrors };
    }, [applySelectionAfterAdd, handleSessionFilesAdded, openAndAddSourceFiles]);

    const selectFile = useCallback((id: string) => {
        dispatchUi({ type: 'file-selected', fileId: id });
    }, []);

    const removeFile = useCallback(
        (id: string) => {
            const remainingIds = files.filter((file) => file.id !== id).map((file) => file.id);
            dispatchUi({ type: 'file-removed', fileId: id, remainingIds });
            handleSessionFileRemoved(removeSourceFile(id));
        },
        [files, handleSessionFileRemoved, removeSourceFile],
    );

    const clearAllFiles = useCallback(() => {
        if (!files.length) return;
        handleSessionFilesCleared();
        dispatchUi({ type: 'cleared' });
        clearAllPages();
        clearSourceFiles();
    }, [clearAllPages, clearSourceFiles, files.length, handleSessionFilesCleared]);

    const rotatePage = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            await rotateSourcePage(fileId, target, direction);
        },
        [rotateSourcePage],
    );

    const focusFinalPageSource = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSource(fileId, target, 'picker');
        },
        [focusSource],
    );

    const focusFinalPageInDocument = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSource(fileId, target, 'final');
        },
        [focusSource],
    );

    const handleDropError = useCallback(
        (error: unknown) => {
            onDropError?.(error);
        },
        [onDropError],
    );

    const { isDragOver } = useFileDrop(acceptFiles, handleDropError);

    return {
        files,
        editsByFile,
        selectedId: uiState.selectedId,
        selectedFileScrollKey: uiState.selectedFileScrollKey,
        selectedFile,
        selectFile,
        focusedSource: uiState.focusedSource,
        addFiles,
        removeFile,
        clearAllFiles,
        rotatePage,
        focusFinalPageSource,
        focusFinalPageInDocument,
        reorderFiles,
        isDragOver,
        ...finalPagesApi,
    };
}
