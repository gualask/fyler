import type { useWorkspace } from './hooks/workspace';

export { DragOverlay } from './components/DragOverlay';
export { EmptyState } from './components/EmptyState';
export { FileList } from './components/file-list/FileList';
export { ProtectedPdfPasswordDialog } from './components/protected-pdf-password-dialog';

export { useAddFilesAction } from './hooks/add-files-action.hook';
export { useWorkspace } from './hooks/workspace';
export { useQuickAdd } from './quick-add/quick-add.hook';
export { useQuickAddActions } from './quick-add/quick-add-actions.hook';
export { QuickAddView } from './quick-add/quick-add-view';
export { fromFinalPageId } from './state/workspace.store';
export { useWorkspaceStoreSelector } from './state/workspace-store.hooks';
export { WorkspaceStoreProvider } from './state/workspace-store.provider';

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
