import { useCallback, useMemo, useReducer } from 'react';
import type { FinalPage, SourceFile } from '@/shared/domain';

import {
    allPdfPagesForFile,
    compositionReducer,
    fromFinalPageId,
    initialCompositionState,
    toImageFinalPageId,
    toPdfFinalPageId,
} from '../state/composition.reducer';

export function useFinalPages() {
    const [state, dispatch] = useReducer(compositionReducer, initialCompositionState);

    const finalPages = useMemo<FinalPage[]>(
        () => state.pageOrder.map((id) => ({ id, ...fromFinalPageId(id) })),
        [state.pageOrder],
    );

    const addAllPagesForFile = useCallback((file: SourceFile) => {
        if (file.kind === 'image') {
            dispatch({ type: 'set-image-included', fileId: file.id, included: true });
            return;
        }
        dispatch({
            type: 'set-pdf-selection',
            fileId: file.id,
            pages: allPdfPagesForFile(file),
        });
    }, []);

    const removePagesForFile = useCallback((fileId: string) => {
        dispatch({ type: 'remove-file', fileId });
    }, []);

    const clearAllPages = useCallback(() => {
        dispatch({ type: 'reset' });
    }, []);

    const togglePage = useCallback(
        (fileId: string, pageNum: number) => {
            const current = state.selectedPdfPagesByFile[fileId] ?? [];
            const next = current.includes(pageNum)
                ? current.filter((n) => n !== pageNum)
                : [...current, pageNum];
            dispatch({ type: 'set-pdf-selection', fileId, pages: next });
        },
        [state.selectedPdfPagesByFile],
    );

    const setPdfPagesForFile = useCallback((fileId: string, pages: number[]) => {
        dispatch({ type: 'set-pdf-selection', fileId, pages });
    }, []);

    const setImageIncluded = useCallback((fileId: string, included: boolean) => {
        dispatch({ type: 'set-image-included', fileId, included });
    }, []);

    const removeFinalPage = useCallback(
        (id: string) => {
            const parsed = fromFinalPageId(id);
            if (parsed.kind === 'image') {
                dispatch({ type: 'set-image-included', fileId: parsed.fileId, included: false });
                return;
            }

            const current = state.selectedPdfPagesByFile[parsed.fileId] ?? [];
            dispatch({
                type: 'set-pdf-selection',
                fileId: parsed.fileId,
                pages: current.filter((n) => n !== parsed.pageNum),
            });
        },
        [state.selectedPdfPagesByFile],
    );

    const reorderFinalPages = useCallback((fromId: string, toId: string) => {
        dispatch({ type: 'reorder', fromId, toId });
    }, []);

    const moveFinalPageToIndex = useCallback((id: string, targetIndex: number) => {
        dispatch({ type: 'move-to-index', id, targetIndex });
    }, []);

    const selectAll = useCallback((file: SourceFile) => {
        if (file.kind === 'image') {
            dispatch({ type: 'set-image-included', fileId: file.id, included: true });
            return;
        }
        dispatch({ type: 'set-pdf-selection', fileId: file.id, pages: allPdfPagesForFile(file) });
    }, []);

    return {
        finalPages,
        selectedPdfPagesByFile: state.selectedPdfPagesByFile,
        includedImagesByFile: state.includedImagesByFile,
        addAllPagesForFile,
        removePagesForFile,
        clearAllPages,
        togglePage,
        setPdfPagesForFile,
        setImageIncluded,
        removeFinalPage,
        reorderFinalPages,
        moveFinalPageToIndex,
        selectAll,
        deselectAll: removePagesForFile,
        toPdfFinalPageId,
        toImageFinalPageId,
    };
}
