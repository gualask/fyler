import { createContext } from 'react';
import type { WorkspaceStoreApi } from './workspace.store';

export const WorkspaceStoreContext = createContext<WorkspaceStoreApi | null>(null);
