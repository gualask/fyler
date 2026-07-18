import { useContext } from 'react';
import { useStore } from 'zustand';
import type { WorkspaceStore, WorkspaceStoreApi } from './workspace.store';
import { WorkspaceStoreContext } from './workspace-store.context';

function useWorkspaceStoreApi(): WorkspaceStoreApi {
    const store = useContext(WorkspaceStoreContext);
    if (!store) throw new Error('useWorkspaceStoreApi must be used within WorkspaceStoreProvider');
    return store;
}

export function useWorkspaceStoreSelector<T>(selector: (state: WorkspaceStore) => T): T {
    return useStore(useWorkspaceStoreApi(), selector);
}
