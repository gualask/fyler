import { useMemo } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import type { FinalPage } from '@/modules/merge/model';
import {
    workspaceFromFinalPageId as fromFinalPageId,
    useWorkspaceStoreSelector,
} from '@/modules/merge/model';
import { deriveFocusedSourceState } from '../workspace.selectors';

export function useWorkspaceFinalPages(): FinalPage[] {
    const pageOrder = useWorkspaceStoreSelector((state) => state.composition.pageOrder);
    return useMemo<FinalPage[]>(
        () => pageOrder.map((id) => ({ id, ...fromFinalPageId(id) })),
        [pageOrder],
    );
}

export function useWorkspaceSelectedFile() {
    const files = useWorkspaceStoreSelector((state) => state.source.files);
    const selectedId = useWorkspaceStoreSelector((state) => state.ui.selectedId);
    return useMemo(() => files.find((file) => file.id === selectedId) ?? null, [files, selectedId]);
}

export function useFocusedPickerState(selectedFile: SourceFile | null) {
    const focusedSource = useWorkspaceStoreSelector((state) => state.ui.focusedSource);
    return deriveFocusedSourceState({ focusedSource, selectedFile });
}
