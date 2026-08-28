import type { SourceFile, SourceTarget } from '@/capabilities/document-sources';
import { resolveSelectionAfterAdd, type SelectionAfterAddIntent } from './workspace-selection';
import type {
    FocusFlashTarget,
    WorkspaceStoreApi,
    WorkspaceUiActions,
    WorkspaceUiState,
} from './workspace-store.types';

export const EMPTY_WORKSPACE_UI_STATE: WorkspaceUiState = {
    selectedId: null,
    selectedFileScrollKey: undefined,
    focusedSource: null,
    uiSignalKey: 0,
};

function withSelectedFile(state: WorkspaceUiState, fileId: string): WorkspaceUiState {
    const signalKey = state.uiSignalKey + 1;
    return {
        ...state,
        selectedId: fileId,
        selectedFileScrollKey: signalKey,
        focusedSource: null,
        uiSignalKey: signalKey,
    };
}

function withFocusedSource(
    state: WorkspaceUiState,
    fileId: string,
    target: SourceTarget,
    flashTarget: FocusFlashTarget,
): WorkspaceUiState {
    const signalKey = state.uiSignalKey + 1;
    return {
        ...state,
        selectedId: fileId,
        selectedFileScrollKey: signalKey,
        focusedSource: { fileId, target, flashKey: signalKey, flashTarget },
        uiSignalKey: signalKey,
    };
}

function applySelectionIntent(
    state: WorkspaceUiState,
    intent: SelectionAfterAddIntent,
): WorkspaceUiState {
    switch (intent.kind) {
        case 'preserve':
            return state;
        case 'select-file':
            return withSelectedFile(state, intent.fileId);
        case 'focus-source':
            return withFocusedSource(state, intent.fileId, intent.target, intent.flashTarget);
    }
}

function applyRemovedFiles(
    state: WorkspaceUiState,
    fileIds: string[],
    remainingIds: string[],
): WorkspaceUiState {
    const removedIds = new Set(fileIds);
    const focusedSource =
        state.focusedSource && removedIds.has(state.focusedSource.fileId)
            ? null
            : state.focusedSource;
    if (!state.selectedId || !removedIds.has(state.selectedId)) {
        return focusedSource === state.focusedSource ? state : { ...state, focusedSource };
    }
    if (remainingIds.length === 0) {
        return { ...state, selectedId: null, selectedFileScrollKey: undefined, focusedSource };
    }
    return withSelectedFile({ ...state, focusedSource }, remainingIds[0]);
}

export function createWorkspaceUiActions(set: WorkspaceStoreApi['setState']): WorkspaceUiActions {
    return {
        applyFilesAddedUi(files: Pick<SourceFile, 'id' | 'kind'>[]) {
            set((state) => ({
                ui: applySelectionIntent(
                    state.ui,
                    resolveSelectionAfterAdd(state.ui.selectedId, files),
                ),
            }));
        },
        selectFile(fileId) {
            set((state) => ({ ui: withSelectedFile(state.ui, fileId) }));
        },
        focusSource(fileId, target, flashTarget) {
            set((state) => ({ ui: withFocusedSource(state.ui, fileId, target, flashTarget) }));
        },
        applyFileRemovedUi(fileId, remainingIds) {
            set((state) => ({ ui: applyRemovedFiles(state.ui, [fileId], remainingIds) }));
        },
        applyFilesRemovedUi(fileIds, remainingIds) {
            set((state) => ({ ui: applyRemovedFiles(state.ui, fileIds, remainingIds) }));
        },
        clearUi() {
            set({ ui: EMPTY_WORKSPACE_UI_STATE });
        },
    };
}
