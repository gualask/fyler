import { useMemo } from 'react';
import { useStore } from 'zustand';
import type { FinalPage } from '@/shared/domain';

import {
    fromFinalPageId,
    toImageFinalPageId,
    toPdfFinalPageId,
    type WorkspaceStoreApi,
} from '../state/workspace.store';

export function useFinalPages(store: WorkspaceStoreApi) {
    const pageOrder = useStore(store, (state) => state.composition.pageOrder);
    const selectedPdfPagesByFile = useStore(
        store,
        (state) => state.composition.selectedPdfPagesByFile,
    );
    const includedImagesByFile = useStore(store, (state) => state.composition.includedImagesByFile);
    const addAllPagesForFile = useStore(store, (state) => state.addAllPagesForFile);
    const removePagesForFile = useStore(store, (state) => state.removePagesForFile);
    const clearAllPages = useStore(store, (state) => state.clearAllPages);
    const togglePage = useStore(store, (state) => state.togglePage);
    const setPdfPagesForFile = useStore(store, (state) => state.setPdfPagesForFile);
    const setImageIncluded = useStore(store, (state) => state.setImageIncluded);
    const removeFinalPage = useStore(store, (state) => state.removeFinalPage);
    const reorderFinalPages = useStore(store, (state) => state.reorderFinalPages);
    const moveFinalPageToIndex = useStore(store, (state) => state.moveFinalPageToIndex);
    const selectAll = useStore(store, (state) => state.selectAll);

    const finalPages = useMemo<FinalPage[]>(
        () => pageOrder.map((id) => ({ id, ...fromFinalPageId(id) })),
        [pageOrder],
    );

    return {
        finalPages,
        selectedPdfPagesByFile,
        includedImagesByFile,
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
