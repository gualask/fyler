import type { SourceFile, SourceTarget } from '@/capabilities/document-sources';
import { FileEditsVO } from './file-edits.vo';
import type { FileEdits } from './merge.types';
import type {
    SourceSessionActions,
    SourceSessionState,
    WorkspaceStoreApi,
} from './workspace-store.types';

export const EMPTY_SOURCE_SESSION_STATE: SourceSessionState = {
    files: [],
    editsByFile: {},
};

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
    if (fromIndex === toIndex) return items;
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
}

function reorderById<T extends { id: string }>(items: T[], fromId: string, toId: string): T[] {
    const fromIndex = items.findIndex((item) => item.id === fromId);
    const toIndex = items.findIndex((item) => item.id === toId);
    if (fromIndex === -1 || toIndex === -1) return items;
    return moveItem(items, fromIndex, toIndex);
}

function withoutFileEdits(
    editsByFile: Record<string, FileEdits>,
    fileIds: Set<string>,
): Record<string, FileEdits> {
    if (!Object.keys(editsByFile).some((fileId) => fileIds.has(fileId))) return editsByFile;
    const next = { ...editsByFile };
    for (const fileId of fileIds) delete next[fileId];
    return next;
}

function findCompatibleRotationFile(files: SourceFile[], fileId: string, target: SourceTarget) {
    const file = files.find((entry) => entry.id === fileId);
    if (!file) return null;
    if (file.kind === 'pdf' && target.kind !== 'pdf') return null;
    if (file.kind === 'image' && target.kind !== 'image') return null;
    return file;
}

export function createSourceSessionActions(
    set: WorkspaceStoreApi['setState'],
    get: WorkspaceStoreApi['getState'],
): SourceSessionActions {
    return {
        addSourceFiles(files) {
            if (!files.length) return [];
            set((state) => ({
                source: { ...state.source, files: [...state.source.files, ...files] },
            }));
            return files;
        },
        removeSourceFiles(fileIds) {
            const idsToRemove = new Set(fileIds);
            const currentFiles = get().source.files;
            if (!idsToRemove.size) {
                return { removedFiles: [], remainingIds: currentFiles.map((file) => file.id) };
            }
            const removedFiles = currentFiles.filter((file) => idsToRemove.has(file.id));
            if (!removedFiles.length) {
                return { removedFiles: [], remainingIds: currentFiles.map((file) => file.id) };
            }
            const remainingFiles = currentFiles.filter((file) => !idsToRemove.has(file.id));
            set((state) => ({
                source: {
                    files: remainingFiles,
                    editsByFile: withoutFileEdits(state.source.editsByFile, idsToRemove),
                },
            }));
            return { removedFiles, remainingIds: remainingFiles.map((file) => file.id) };
        },
        clearSourceFiles() {
            const files = get().source.files;
            if (!files.length) return [];
            set({ source: EMPTY_SOURCE_SESSION_STATE });
            return files;
        },
        reorderFiles(fromId, toId) {
            set((state) => ({
                source: { ...state.source, files: reorderById(state.source.files, fromId, toId) },
            }));
        },
        rotateSourcePage(fileId, target, direction) {
            const { source } = get();
            const file = findCompatibleRotationFile(source.files, fileId, target);
            if (!file) return null;
            const edits = FileEditsVO.applyRotation(source.editsByFile[file.id], target, direction);
            set((state) => ({
                source: {
                    ...state.source,
                    editsByFile: { ...state.source.editsByFile, [file.id]: edits },
                },
            }));
            return { file, target, edits };
        },
    };
}
