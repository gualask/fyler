import type { ReactNode } from 'react';
import type { WorkspaceStoreApi } from './workspace.store';
import { WorkspaceStoreContext } from './workspace-store.context';

export function WorkspaceStoreProvider({
    store,
    children,
}: {
    store: WorkspaceStoreApi;
    children: ReactNode;
}) {
    return (
        <WorkspaceStoreContext.Provider value={store}>{children}</WorkspaceStoreContext.Provider>
    );
}
