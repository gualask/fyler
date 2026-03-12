import { useCallback, useMemo, useReducer } from 'react';
import type { SourceFile, FinalPage } from '../domain';

type CompositionState = {
    selectedPagesByFile: Record<string, number[]>;
    pageOrder: string[];
};

type CompositionAction =
    | { type: 'set-file-selection'; fileId: string; pages: number[] }
    | { type: 'remove-file'; fileId: string }
    | { type: 'reorder'; fromId: string; toId: string }
    | { type: 'move-to-index'; id: string; targetIndex: number };

const initialState: CompositionState = {
    selectedPagesByFile: {},
    pageOrder: [],
};

function toFinalPageId(fileId: string, pageNum: number): string {
    return `${fileId}:${pageNum}`;
}

function fromFinalPageId(id: string): { fileId: string; pageNum: number } {
    const separator = id.lastIndexOf(':');
    return {
        fileId: id.slice(0, separator),
        pageNum: Number.parseInt(id.slice(separator + 1), 10),
    };
}

function normalizePages(pages: number[]): number[] {
    return Array.from(new Set(pages)).sort((a, b) => a - b);
}

function allPagesForFile(file: SourceFile): number[] {
    return file.kind === 'image'
        ? [0]
        : Array.from({ length: file.pageCount }, (_, i) => i + 1);
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
    const fromIdx = pageOrder.findIndex((id) => id === fromId);
    const toIdx = pageOrder.findIndex((id) => id === toId);
    if (fromIdx === -1 || toIdx === -1) return pageOrder;
    return moveItem(pageOrder, fromIdx, toIdx);
}

function moveItem<T>(items: T[], fromIdx: number, toIdx: number): T[] {
    if (fromIdx === toIdx) return items;
    const next = [...items];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
}

function movePageIdToIndex(pageOrder: string[], id: string, targetIndex: number): string[] {
    const fromIdx = pageOrder.findIndex((pageId) => pageId === id);
    if (fromIdx === -1) return pageOrder;

    const boundedIndex = Math.min(Math.max(targetIndex, 0), pageOrder.length - 1);
    return moveItem(pageOrder, fromIdx, boundedIndex);
}

function compositionReducer(state: CompositionState, action: CompositionAction): CompositionState {
    switch (action.type) {
        case 'set-file-selection': {
            const pages = normalizePages(action.pages);
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

export function useFinalPages() {
    const [state, dispatch] = useReducer(compositionReducer, initialState);

    const finalPages = useMemo<FinalPage[]>(
        () => state.pageOrder.map((id) => {
            const { fileId, pageNum } = fromFinalPageId(id);
            return { id, fileId, pageNum };
        }),
        [state.pageOrder],
    );

    const addAllPagesForFile = useCallback((file: SourceFile) => {
        dispatch({ type: 'set-file-selection', fileId: file.id, pages: allPagesForFile(file) });
    }, []);

    const removePagesForFile = useCallback((fileId: string) => {
        dispatch({ type: 'remove-file', fileId });
    }, []);

    const togglePage = useCallback((fileId: string, pageNum: number) => {
        const current = state.selectedPagesByFile[fileId] ?? [];
        const next = current.includes(pageNum)
            ? current.filter((n) => n !== pageNum)
            : [...current, pageNum];
        dispatch({ type: 'set-file-selection', fileId, pages: next });
    }, [state.selectedPagesByFile]);

    const togglePageRange = useCallback((fileId: string, from: number, to: number) => {
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        const current = state.selectedPagesByFile[fileId] ?? [];
        const currentSet = new Set(current);
        const rangeNums = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
        const allPresent = rangeNums.every((pageNum) => currentSet.has(pageNum));
        const next = allPresent
            ? current.filter((pageNum) => pageNum < lo || pageNum > hi)
            : [...current, ...rangeNums.filter((pageNum) => !currentSet.has(pageNum))];
        dispatch({ type: 'set-file-selection', fileId, pages: next });
    }, [state.selectedPagesByFile]);

    const setPagesForFile = useCallback((fileId: string, pages: number[]) => {
        dispatch({ type: 'set-file-selection', fileId, pages });
    }, []);

    const removeFinalPage = useCallback((id: string) => {
        const { fileId, pageNum } = fromFinalPageId(id);
        const current = state.selectedPagesByFile[fileId] ?? [];
        dispatch({
            type: 'set-file-selection',
            fileId,
            pages: current.filter((n) => n !== pageNum),
        });
    }, [state.selectedPagesByFile]);

    const reorderFinalPages = useCallback((fromId: string, toId: string) => {
        dispatch({ type: 'reorder', fromId, toId });
    }, []);

    const moveFinalPageToIndex = useCallback((id: string, targetIndex: number) => {
        dispatch({ type: 'move-to-index', id, targetIndex });
    }, []);

    const selectAll = useCallback((file: SourceFile) => {
        dispatch({ type: 'set-file-selection', fileId: file.id, pages: allPagesForFile(file) });
    }, []);

    return {
        finalPages,
        selectedPagesByFile: state.selectedPagesByFile,
        addAllPagesForFile,
        removePagesForFile,
        togglePage,
        togglePageRange,
        setPagesForFile,
        removeFinalPage,
        reorderFinalPages,
        moveFinalPageToIndex,
        selectAll,
        deselectAll: removePagesForFile,
    };
}
