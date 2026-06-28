import { useCallback, useMemo, useReducer } from 'react';
import { initialWorkspaceUiState, workspaceUiReducer } from '../../state/workspace-ui.reducer';
import { useFileDrop } from '../file-drop.hook';
import { useFinalPages } from '../final-pages.hook';
import { useProtectedPdfImportResolver } from '../protected-pdf-import';
import { useSourceSession } from '../source-session.hook';
import {
    useWorkspaceSourceEvents,
    type WorkspaceFilesAddedEvent,
} from '../workspace-source-events';
import { useWorkspaceFileActions } from './workspace-file-actions.hook';
import { useWorkspaceFocusActions } from './workspace-focus-actions.hook';
import { useWorkspaceImportActions } from './workspace-import-actions.hook';

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
    const { acceptFiles, addFiles } = useWorkspaceImportActions({
        dispatchUi,
        addSourceFiles,
        openSourceFiles,
        resolveImportResult,
        handleSessionFilesAdded,
    });
    const { clearAllFiles, removeFile, removeFiles, rotatePage, selectFile } =
        useWorkspaceFileActions({
            files,
            dispatchUi,
            handleSessionFileRemoved,
            handleSessionFilesCleared,
            removeSourceFile,
            clearSourceFiles,
            clearAllPages,
            rotateSourcePage,
        });
    const { focusFinalPageSource, focusFinalPageInDocument } = useWorkspaceFocusActions(dispatchUi);

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
