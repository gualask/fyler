import type { useWorkspace } from './hooks/workspace.hook';

export { DragOverlay } from './components/DragOverlay';
export { EmptyState } from './components/EmptyState';
export { FileList } from './components/file-list/FileList';

export { useAddFilesAction } from './hooks/add-files-action.hook';
export { useWorkspace } from './hooks/workspace.hook';
export { QuickAddView } from './quick-add/QuickAddView';
export { useQuickAdd } from './quick-add/quick-add.hook';
export { useQuickAddActions } from './quick-add/quick-add-actions.hook';

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
