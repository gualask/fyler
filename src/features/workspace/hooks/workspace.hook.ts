import { useCallback, useMemo, useReducer } from 'react';
import type { OpenFilesResult, RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { initialWorkspaceUiState, workspaceUiReducer } from '../state/workspace-ui.reducer';
import { useFileDrop } from './file-drop.hook';
import { useFinalPages } from './final-pages.hook';
import { useProtectedPdfImportResolver } from './protected-pdf-import.hook';
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
        openSourceFiles,
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
    const { resolveImportResult, passwordDialog } = useProtectedPdfImportResolver();

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
        removeFiles,
        clearAllFiles,
        rotatePage,
        focusFinalPageSource,
        focusFinalPageInDocument,
        reorderFiles,
        isDragOver,
        passwordDialog,
        ...finalPagesApi,
    };
}
