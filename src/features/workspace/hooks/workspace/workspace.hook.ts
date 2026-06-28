import { useCallback, useMemo, useRef } from 'react';
import { useStore } from 'zustand';
import { createWorkspaceStore, type WorkspaceStoreApi } from '../../state/workspace.store';
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

function useWorkspaceStore(): WorkspaceStoreApi {
    const storeRef = useRef<WorkspaceStoreApi | null>(null);
    if (!storeRef.current) {
        storeRef.current = createWorkspaceStore();
    }
    return storeRef.current;
}

export function useWorkspace({
    onFilesAdded,
    onDropError,
}: {
    onFilesAdded?: (event: WorkspaceFilesAddedEvent) => void;
    onDropError?: (error: unknown) => void;
} = {}) {
    const store = useWorkspaceStore();
    const selectedId = useStore(store, (state) => state.ui.selectedId);
    const selectedFileScrollKey = useStore(store, (state) => state.ui.selectedFileScrollKey);
    const focusedSource = useStore(store, (state) => state.ui.focusedSource);
    const applyFilesAddedUi = useStore(store, (state) => state.applyFilesAddedUi);
    const applyFileRemovedUi = useStore(store, (state) => state.applyFileRemovedUi);
    const applyFilesRemovedUi = useStore(store, (state) => state.applyFilesRemovedUi);
    const clearUi = useStore(store, (state) => state.clearUi);
    const selectFileState = useStore(store, (state) => state.selectFile);
    const focusSource = useStore(store, (state) => state.focusSource);
    const finalPagesApi = useFinalPages(store);
    const { addAllPagesForFile, setPdfPagesForFile, removePagesForFile, clearAllPages } =
        finalPagesApi;

    const {
        files,
        editsByFile,
        addSourceFiles,
        openSourceFiles,
        removeSourceFile,
        removeSourceFiles,
        clearSourceFiles,
        rotateSourcePage,
        reorderFiles,
        updateFilePageCount,
    } = useSourceSession(store);

    const removeSourceFileForEvents = useCallback(
        (id: string) => {
            const { removed, remainingIds } = removeSourceFile(id);
            if (removed) {
                applyFileRemovedUi(id, remainingIds);
            }
            return removed;
        },
        [applyFileRemovedUi, removeSourceFile],
    );

    const { handleSessionFilesAdded, handleSessionFileRemoved, handleSessionFilesCleared } =
        useWorkspaceSourceEvents({
            files,
            updateFilePageCount,
            setPdfPagesForFile,
            removeSourceFile: removeSourceFileForEvents,
            removePagesForFile,
            addAllPagesForFile,
            onFilesAdded,
            onDropError,
        });

    const selectedFile = useMemo(
        () => files.find((file) => file.id === selectedId) ?? null,
        [files, selectedId],
    );
    const { resolveImportResult, passwordDialog } = useProtectedPdfImportResolver();
    const { acceptFiles, addFiles } = useWorkspaceImportActions({
        applyFilesAddedUi,
        addSourceFiles,
        openSourceFiles,
        resolveImportResult,
        handleSessionFilesAdded,
    });
    const { clearAllFiles, removeFile, removeFiles, rotatePage, selectFile } =
        useWorkspaceFileActions({
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
        });
    const { focusFinalPageSource, focusFinalPageInDocument } =
        useWorkspaceFocusActions(focusSource);

    const handleDropError = useCallback(
        (error: unknown) => {
            onDropError?.(error);
        },
        [onDropError],
    );

    const { isDragOver } = useFileDrop(acceptFiles, handleDropError);

    return {
        store,
        files,
        editsByFile,
        selectedId,
        selectedFileScrollKey,
        selectedFile,
        selectFile,
        focusedSource,
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
