import { createStore } from 'zustand/vanilla';
import {
    createCompositionActions,
    EMPTY_COMPOSITION_STATE,
    fromFinalPageId,
    toImageFinalPageId,
    toPdfFinalPageId,
} from './workspace-composition';
import { createSourceSessionActions, EMPTY_SOURCE_SESSION_STATE } from './workspace-source-session';
import type {
    CompositionState,
    FocusFlashTarget,
    WorkspaceStore,
    WorkspaceStoreApi,
} from './workspace-store.types';
import { createWorkspaceUiActions, EMPTY_WORKSPACE_UI_STATE } from './workspace-ui-state';

export type { CompositionState, FocusFlashTarget, WorkspaceStore, WorkspaceStoreApi };
export { fromFinalPageId, toImageFinalPageId, toPdfFinalPageId };

export function createWorkspaceStore(): WorkspaceStoreApi {
    return createStore<WorkspaceStore>((set, get) => ({
        source: EMPTY_SOURCE_SESSION_STATE,
        composition: EMPTY_COMPOSITION_STATE,
        ui: EMPTY_WORKSPACE_UI_STATE,
        ...createSourceSessionActions(set, get),
        ...createCompositionActions(set),
        ...createWorkspaceUiActions(set),
    }));
}
