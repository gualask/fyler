import { useCallback, useMemo, useReducer } from 'react';
import type { FinalPage, SourceFile } from '@/shared/domain';

import {
    allPagesForFile,
    compositionReducer,
    fromFinalPageId,
    initialCompositionState,
} from '../state/composition.reducer';

export function useFinalPages() {
    const [state, dispatch] = useReducer(compositionReducer, initialCompositionState);

    const finalPages = useMemo<FinalPage[]>(
        () =>
            state.pageOrder.map((id) => {
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

    const clearAllPages = useCallback(() => {
        dispatch({ type: 'reset' });
    }, []);

    const togglePage = useCallback(
        (fileId: string, pageNum: number) => {
            const current = state.selectedPagesByFile[fileId] ?? [];
            const next = current.includes(pageNum)
                ? current.filter((n) => n !== pageNum)
                : [...current, pageNum];
            dispatch({ type: 'set-file-selection', fileId, pages: next });
        },
        [state.selectedPagesByFile],
    );

    const togglePageRange = useCallback(
        (fileId: string, from: number, to: number) => {
            const [lo, hi] = from <= to ? [from, to] : [to, from];
            const current = state.selectedPagesByFile[fileId] ?? [];
            const currentSet = new Set(current);
            const rangeNums = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
            const allPresent = rangeNums.every((pageNum) => currentSet.has(pageNum));
            const next = allPresent
                ? current.filter((pageNum) => pageNum < lo || pageNum > hi)
                : [...current, ...rangeNums.filter((pageNum) => !currentSet.has(pageNum))];
            dispatch({ type: 'set-file-selection', fileId, pages: next });
        },
        [state.selectedPagesByFile],
    );

    const setPagesForFile = useCallback((fileId: string, pages: number[]) => {
        dispatch({ type: 'set-file-selection', fileId, pages });
    }, []);

    const removeFinalPage = useCallback(
        (id: string) => {
            const { fileId, pageNum } = fromFinalPageId(id);
            const current = state.selectedPagesByFile[fileId] ?? [];
            dispatch({
                type: 'set-file-selection',
                fileId,
                pages: current.filter((n) => n !== pageNum),
            });
        },
        [state.selectedPagesByFile],
    );

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
        clearAllPages,
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
