import type { SourceFile, SourceTarget } from '@/shared/domain';
import {
    resolveSelectionAfterAdd,
    type SelectionAfterAddIntent,
} from '../hooks/added-file-selection';

type FocusFlashTarget = 'picker' | 'final';

export interface WorkspaceUiState {
    selectedId: string | null;
    selectedFileScrollKey?: number;
    focusedSource: {
        fileId: string;
        target: SourceTarget;
        flashKey: number;
        flashTarget: FocusFlashTarget;
    } | null;
    uiSignalKey: number;
}

export type WorkspaceUiAction =
    | { type: 'files-added'; files: Pick<SourceFile, 'id' | 'kind'>[] }
    | { type: 'file-selected'; fileId: string }
    | {
          type: 'source-focused';
          fileId: string;
          target: SourceTarget;
          flashTarget: FocusFlashTarget;
      }
    | { type: 'file-removed'; fileId: string; remainingIds: string[] }
    | { type: 'files-removed'; fileIds: string[]; remainingIds: string[] }
    | { type: 'cleared' };

export const initialWorkspaceUiState: WorkspaceUiState = {
    selectedId: null,
    selectedFileScrollKey: undefined,
    focusedSource: null,
    uiSignalKey: 0,
};

function nextUiSignalKey(state: WorkspaceUiState): number {
    return state.uiSignalKey + 1;
}

function withSelectedFile(state: WorkspaceUiState, fileId: string): WorkspaceUiState {
    const signalKey = nextUiSignalKey(state);
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
    const signalKey = nextUiSignalKey(state);
    return {
        ...state,
        selectedId: fileId,
        selectedFileScrollKey: signalKey,
        focusedSource: {
            fileId,
            target,
            flashKey: signalKey,
            flashTarget,
        },
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
        return {
            ...state,
            selectedId: null,
            selectedFileScrollKey: undefined,
            focusedSource,
        };
    }

    return withSelectedFile({ ...state, focusedSource }, remainingIds[0]);
}

export function workspaceUiReducer(
    state: WorkspaceUiState,
    action: WorkspaceUiAction,
): WorkspaceUiState {
    switch (action.type) {
        case 'files-added':
            return applySelectionIntent(
                state,
                resolveSelectionAfterAdd(state.selectedId, action.files),
            );
        case 'file-selected':
            return withSelectedFile(state, action.fileId);
        case 'source-focused':
            return withFocusedSource(state, action.fileId, action.target, action.flashTarget);
        case 'file-removed':
            return applyRemovedFiles(state, [action.fileId], action.remainingIds);
        case 'files-removed':
            return applyRemovedFiles(state, action.fileIds, action.remainingIds);
        case 'cleared':
            return initialWorkspaceUiState;
        default:
            return state;
    }
}
