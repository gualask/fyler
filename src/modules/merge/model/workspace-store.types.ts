import type { StoreApi } from 'zustand/vanilla';
import type { SourceFile, SourceTarget } from '@/capabilities/document-sources';
import type { RotationDirection } from '@/shared/domain';
import type { FileEdits } from './merge.types';

export type FocusFlashTarget = 'picker' | 'final';

export type SourceSessionState = {
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
};

export type CompositionState = {
    selectedPdfPagesByFile: Record<string, number[]>;
    includedImagesByFile: Record<string, true>;
    pageOrder: string[];
};

export type WorkspaceUiState = {
    selectedId: string | null;
    selectedFileScrollKey?: number;
    focusedSource: {
        fileId: string;
        target: SourceTarget;
        flashKey: number;
        flashTarget: FocusFlashTarget;
    } | null;
    uiSignalKey: number;
};

export type SourceSessionActions = {
    addSourceFiles: (files: SourceFile[]) => SourceFile[];
    removeSourceFiles: (fileIds: readonly string[]) => {
        removedFiles: SourceFile[];
        remainingIds: string[];
    };
    clearSourceFiles: () => SourceFile[];
    reorderFiles: (fromId: string, toId: string) => void;
    rotateSourcePage: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => { file: SourceFile; target: SourceTarget; edits: FileEdits } | null;
};

export type CompositionActions = {
    addAllPagesForFile: (file: SourceFile) => void;
    removePagesForFile: (fileId: string) => void;
    clearAllPages: () => void;
    togglePage: (fileId: string, pageNum: number) => void;
    setPdfPagesForFile: (fileId: string, pages: number[]) => void;
    setImageIncluded: (fileId: string, included: boolean) => void;
    removeFinalPage: (id: string) => void;
    reorderFinalPages: (fromId: string, toId: string) => void;
    moveFinalPageToIndex: (id: string, targetIndex: number) => void;
    selectAll: (file: SourceFile) => void;
};

export type WorkspaceUiActions = {
    applyFilesAddedUi: (files: Pick<SourceFile, 'id' | 'kind'>[]) => void;
    selectFile: (fileId: string) => void;
    focusSource: (fileId: string, target: SourceTarget, flashTarget: FocusFlashTarget) => void;
    applyFileRemovedUi: (fileId: string, remainingIds: string[]) => void;
    applyFilesRemovedUi: (fileIds: string[], remainingIds: string[]) => void;
    clearUi: () => void;
};

type WorkspaceStoreState = {
    source: SourceSessionState;
    composition: CompositionState;
    ui: WorkspaceUiState;
};

export type WorkspaceStore = WorkspaceStoreState &
    SourceSessionActions &
    CompositionActions &
    WorkspaceUiActions;
export type WorkspaceStoreApi = StoreApi<WorkspaceStore>;
