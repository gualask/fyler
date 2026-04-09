import type { SourceFile } from '@/shared/domain';

import { uniqueSortedNumbers } from '@/shared/domain/utils/number-list';

export type CompositionState = {
    selectedPagesByFile: Record<string, number[]>;
    pageOrder: string[];
};

export type CompositionAction =
    | { type: 'set-file-selection'; fileId: string; pages: number[] }
    | { type: 'remove-file'; fileId: string }
    | { type: 'reset' }
    | { type: 'reorder'; fromId: string; toId: string }
    | { type: 'move-to-index'; id: string; targetIndex: number };

export const initialCompositionState: CompositionState = {
    selectedPagesByFile: {},
    pageOrder: [],
};

export function toFinalPageId(fileId: string, pageNum: number): string {
    return `${fileId}:${pageNum}`;
}

export function fromFinalPageId(id: string): { fileId: string; pageNum: number } {
    const separator = id.lastIndexOf(':');
    return {
        fileId: id.slice(0, separator),
        pageNum: Number.parseInt(id.slice(separator + 1), 10),
    };
}

export function allPagesForFile(file: SourceFile): number[] {
    return file.kind === 'image' ? [0] : Array.from({ length: file.pageCount }, (_, i) => i + 1);
}

function moveItem<T>(items: T[], fromIdx: number, toIdx: number): T[] {
    if (fromIdx === toIdx) return items;
    const next = [...items];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
}

function reconcileFileOrder(pageOrder: string[], fileId: string, pages: number[]): string[] {
    const idsForFile = pages.map((pageNum) => toFinalPageId(fileId, pageNum));
    const idsForFileSet = new Set(idsForFile);
    const prefix = `${fileId}:`;

    const kept = pageOrder.filter((id) => !id.startsWith(prefix) || idsForFileSet.has(id));
    const keptSet = new Set(kept);
    const additions = idsForFile.filter((id) => !keptSet.has(id));
    return [...kept, ...additions];
}

function reorderPageIds(pageOrder: string[], fromId: string, toId: string): string[] {
    const fromIdx = pageOrder.indexOf(fromId);
    const toIdx = pageOrder.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return pageOrder;
    return moveItem(pageOrder, fromIdx, toIdx);
}

function movePageIdToIndex(pageOrder: string[], id: string, targetIndex: number): string[] {
    const fromIdx = pageOrder.indexOf(id);
    if (fromIdx === -1) return pageOrder;

    const boundedIndex = Math.min(Math.max(targetIndex, 0), pageOrder.length - 1);
    return moveItem(pageOrder, fromIdx, boundedIndex);
}

export function compositionReducer(
    state: CompositionState,
    action: CompositionAction,
): CompositionState {
    switch (action.type) {
        case 'set-file-selection': {
            const pages = uniqueSortedNumbers(action.pages);
            const selectedPagesByFile = { ...state.selectedPagesByFile };

            if (pages.length === 0) {
                delete selectedPagesByFile[action.fileId];
            } else {
                selectedPagesByFile[action.fileId] = pages;
            }

            return {
                selectedPagesByFile,
                pageOrder: reconcileFileOrder(state.pageOrder, action.fileId, pages),
            };
        }
        case 'remove-file': {
            const selectedPagesByFile = { ...state.selectedPagesByFile };
            delete selectedPagesByFile[action.fileId];

            return {
                selectedPagesByFile,
                pageOrder: state.pageOrder.filter((id) => !id.startsWith(`${action.fileId}:`)),
            };
        }
        case 'reset':
            return initialCompositionState;
        case 'reorder':
            return {
                ...state,
                pageOrder: reorderPageIds(state.pageOrder, action.fromId, action.toId),
            };
        case 'move-to-index':
            return {
                ...state,
                pageOrder: movePageIdToIndex(state.pageOrder, action.id, action.targetIndex),
            };
        default:
            return state;
    }
}
