import type { useWorkspace } from './hooks/workspace.hook';

export { DragOverlay } from './components/DragOverlay';
export { EmptyState } from './components/EmptyState';
export { FileList } from './components/FileList';
export { QuickAddView } from './components/QuickAddView';

export { useAddFilesAction } from './hooks/add-files-action.hook';
export { useQuickAdd } from './hooks/quick-add.hook';
export { useQuickAddActions } from './hooks/quick-add-actions.hook';
export { useWorkspace } from './hooks/workspace.hook';

export type WorkspaceApi = ReturnType<typeof useWorkspace>;
