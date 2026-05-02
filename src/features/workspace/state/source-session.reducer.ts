import type { FileEdits, SourceFile } from '@/shared/domain';

export interface SourceSessionState {
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
}

export type SourceSessionAction =
    | { type: 'add-files'; files: SourceFile[] }
    | { type: 'remove-file'; fileId: string }
    | { type: 'clear' }
    | { type: 'reorder-files'; fromId: string; toId: string }
    | { type: 'update-file-page-count'; fileId: string; count: number }
    | { type: 'set-file-edits'; fileId: string; edits: FileEdits };

export const initialSourceSessionState: SourceSessionState = {
    files: [],
    editsByFile: {},
};

function reorderById<T extends { id: string }>(arr: T[], fromId: string, toId: string): T[] {
    const fromIdx = arr.findIndex((x) => x.id === fromId);
    const toIdx = arr.findIndex((x) => x.id === toId);
    if (fromIdx === -1 || toIdx === -1) return arr;
    const next = [...arr];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
}

function withoutFileEdits(
    editsByFile: Record<string, FileEdits>,
    fileId: string,
): Record<string, FileEdits> {
    if (!(fileId in editsByFile)) return editsByFile;
    const next = { ...editsByFile };
    delete next[fileId];
    return next;
}

export function sourceSessionReducer(
    state: SourceSessionState,
    action: SourceSessionAction,
): SourceSessionState {
    switch (action.type) {
        case 'add-files':
            return action.files.length
                ? { ...state, files: [...state.files, ...action.files] }
                : state;
        case 'remove-file':
            return {
                files: state.files.filter((file) => file.id !== action.fileId),
                editsByFile: withoutFileEdits(state.editsByFile, action.fileId),
            };
        case 'clear':
            return initialSourceSessionState;
        case 'reorder-files':
            return {
                ...state,
                files: reorderById(state.files, action.fromId, action.toId),
            };
        case 'update-file-page-count':
            return {
                ...state,
                files: state.files.map((file) =>
                    file.id === action.fileId ? { ...file, pageCount: action.count } : file,
                ),
            };
        case 'set-file-edits':
            return {
                ...state,
                editsByFile: {
                    ...state.editsByFile,
                    [action.fileId]: action.edits,
                },
            };
        default:
            return state;
    }
}
