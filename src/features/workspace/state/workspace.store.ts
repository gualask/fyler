import { createStore, type StoreApi } from 'zustand/vanilla';
import type { FileEdits, RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { parseFinalPageId, toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { uniqueSortedNumbers } from '@/shared/domain/utils/number-list';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { resolveSelectionAfterAdd, type SelectionAfterAddIntent } from './workspace-selection';

export type FocusFlashTarget = 'picker' | 'final';

type SourceSessionState = {
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
};

export type CompositionState = {
    selectedPdfPagesByFile: Record<string, number[]>;
    includedImagesByFile: Record<string, true>;
    pageOrder: string[];
};

type WorkspaceUiState = {
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

type RemovedSourceFilesResult = {
    removedFiles: SourceFile[];
    remainingIds: string[];
};

type RotationResult = {
    file: SourceFile;
    target: SourceTarget;
    edits: FileEdits;
};

type WorkspaceStoreState = {
    source: SourceSessionState;
    composition: CompositionState;
    ui: WorkspaceUiState;
};

type WorkspaceStoreActions = {
    addSourceFiles: (files: SourceFile[]) => SourceFile[];
    removeSourceFiles: (fileIds: readonly string[]) => RemovedSourceFilesResult;
    clearSourceFiles: () => SourceFile[];
    reorderFiles: (fromId: string, toId: string) => void;
    updateFilePageCount: (fileId: string, count: number) => void;
    rotateSourcePage: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => RotationResult | null;
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
    applyFilesAddedUi: (files: Pick<SourceFile, 'id' | 'kind'>[]) => void;
    selectFile: (fileId: string) => void;
    focusSource: (fileId: string, target: SourceTarget, flashTarget: FocusFlashTarget) => void;
    applyFileRemovedUi: (fileId: string, remainingIds: string[]) => void;
    applyFilesRemovedUi: (fileIds: string[], remainingIds: string[]) => void;
    clearUi: () => void;
};

export type WorkspaceStore = WorkspaceStoreState & WorkspaceStoreActions;
export type WorkspaceStoreApi = StoreApi<WorkspaceStore>;

const EMPTY_SOURCE_SESSION_STATE: SourceSessionState = {
    files: [],
    editsByFile: {},
};

const EMPTY_COMPOSITION_STATE: CompositionState = {
    selectedPdfPagesByFile: {},
    includedImagesByFile: {},
    pageOrder: [],
};

const EMPTY_WORKSPACE_UI_STATE: WorkspaceUiState = {
    selectedId: null,
    selectedFileScrollKey: undefined,
    focusedSource: null,
    uiSignalKey: 0,
};

const initialWorkspaceStoreState: WorkspaceStoreState = {
    source: EMPTY_SOURCE_SESSION_STATE,
    composition: EMPTY_COMPOSITION_STATE,
    ui: EMPTY_WORKSPACE_UI_STATE,
};

export function toPdfFinalPageId(fileId: string, pageNum: number): string {
    return toFinalPageId(fileId, { kind: 'pdf', pageNum });
}

export function toImageFinalPageId(fileId: string): string {
    return toFinalPageId(fileId, { kind: 'image' });
}

export function fromFinalPageId(
    id: string,
): { fileId: string; kind: 'pdf'; pageNum: number } | { fileId: string; kind: 'image' } {
    const parsed = parseFinalPageId(id);
    return parsed.target.kind === 'image'
        ? { fileId: parsed.fileId, kind: 'image' }
        : { fileId: parsed.fileId, kind: 'pdf', pageNum: parsed.target.pageNum };
}

function allPdfPagesForFile(file: SourceFile): number[] {
    if (file.pageCount === null) return [];
    return Array.from({ length: file.pageCount }, (_, i) => i + 1);
}

function moveItem<T>(items: T[], fromIdx: number, toIdx: number): T[] {
    if (fromIdx === toIdx) return items;
    const next = [...items];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
}

function reorderById<T extends { id: string }>(items: T[], fromId: string, toId: string): T[] {
    const fromIdx = items.findIndex((item) => item.id === fromId);
    const toIdx = items.findIndex((item) => item.id === toId);
    if (fromIdx === -1 || toIdx === -1) return items;
    return moveItem(items, fromIdx, toIdx);
}

function withoutFileEdits(
    editsByFile: Record<string, FileEdits>,
    fileIds: Set<string>,
): Record<string, FileEdits> {
    if (!Object.keys(editsByFile).some((fileId) => fileIds.has(fileId))) return editsByFile;

    const next = { ...editsByFile };
    for (const fileId of fileIds) {
        delete next[fileId];
    }
    return next;
}

function findCompatibleRotationFile(files: SourceFile[], fileId: string, target: SourceTarget) {
    const file = files.find((entry) => entry.id === fileId);
    if (!file) return null;
    if (file.kind === 'pdf' && target.kind !== 'pdf') return null;
    if (file.kind === 'image' && target.kind !== 'image') return null;
    return file;
}

function setPdfSelection(
    state: CompositionState,
    fileId: string,
    requestedPages: number[],
): CompositionState {
    const pages = uniqueSortedNumbers(requestedPages);
    const selectedPdfPagesByFile = { ...state.selectedPdfPagesByFile };

    if (pages.length === 0) {
        delete selectedPdfPagesByFile[fileId];
    } else {
        selectedPdfPagesByFile[fileId] = pages;
    }

    return {
        ...state,
        selectedPdfPagesByFile,
        pageOrder: reconcilePdfFileOrder(state.pageOrder, fileId, pages),
    };
}

function setImageIncluded(
    state: CompositionState,
    fileId: string,
    included: boolean,
): CompositionState {
    const includedImagesByFile = { ...state.includedImagesByFile };
    const imageId = toImageFinalPageId(fileId);

    if (included) {
        includedImagesByFile[fileId] = true;
        if (state.pageOrder.includes(imageId)) {
            return { ...state, includedImagesByFile };
        }
        return { ...state, includedImagesByFile, pageOrder: [...state.pageOrder, imageId] };
    }

    delete includedImagesByFile[fileId];
    return {
        ...state,
        includedImagesByFile,
        pageOrder: state.pageOrder.filter((id) => id !== imageId),
    };
}

function removeFileFromComposition(state: CompositionState, fileId: string): CompositionState {
    const selectedPdfPagesByFile = { ...state.selectedPdfPagesByFile };
    const includedImagesByFile = { ...state.includedImagesByFile };
    delete selectedPdfPagesByFile[fileId];
    delete includedImagesByFile[fileId];

    return {
        selectedPdfPagesByFile,
        includedImagesByFile,
        pageOrder: state.pageOrder.filter((id) => !id.startsWith(`${fileId}:`)),
    };
}

function reconcilePdfFileOrder(pageOrder: string[], fileId: string, pages: number[]): string[] {
    const idsForFile = pages.map((pageNum) => toPdfFinalPageId(fileId, pageNum));
    const idsForFileSet = new Set(idsForFile);
    const prefix = `${fileId}:`;

    const kept = pageOrder.filter((id) => !id.startsWith(prefix) || idsForFileSet.has(id));
    const keptSet = new Set(kept);
    const additions = idsForFile.filter((id) => !keptSet.has(id));
    return [...kept, ...additions];
}

function reorderPageIds(pageOrder: string[], fromId: string, toId: string): string[] {
    const fromIdx = pageOrder.indexOf(fromId);
    const toIdx = pageOrder.indexOf(toId);
    if (fromIdx === -1 || toIdx === -1) return pageOrder;
    return moveItem(pageOrder, fromIdx, toIdx);
}

function movePageIdToIndex(pageOrder: string[], id: string, targetIndex: number): string[] {
    const fromIdx = pageOrder.indexOf(id);
    if (fromIdx === -1) return pageOrder;

    const boundedIndex = Math.min(Math.max(targetIndex, 0), pageOrder.length - 1);
    return moveItem(pageOrder, fromIdx, boundedIndex);
}

function selectedPdfPagesWithToggle(
    selectedPdfPagesByFile: Record<string, number[]>,
    fileId: string,
    pageNum: number,
) {
    const current = selectedPdfPagesByFile[fileId] ?? [];
    return current.includes(pageNum)
        ? current.filter((entry) => entry !== pageNum)
        : [...current, pageNum];
}

function nextUiSignalKey(state: WorkspaceUiState): number {
    return state.uiSignalKey + 1;
}

function withSelectedFile(state: WorkspaceUiState, fileId: string): WorkspaceUiState {
    const signalKey = nextUiSignalKey(state);
    return {
        ...state,
        selectedId: fileId,
        selectedFileScrollKey: signalKey,
        focusedSource: null,
        uiSignalKey: signalKey,
    };
}

function withFocusedSource(
    state: WorkspaceUiState,
    fileId: string,
    target: SourceTarget,
    flashTarget: FocusFlashTarget,
): WorkspaceUiState {
    const signalKey = nextUiSignalKey(state);
    return {
        ...state,
        selectedId: fileId,
        selectedFileScrollKey: signalKey,
        focusedSource: {
            fileId,
            target,
            flashKey: signalKey,
            flashTarget,
        },
        uiSignalKey: signalKey,
    };
}

function applySelectionIntent(
    state: WorkspaceUiState,
    intent: SelectionAfterAddIntent,
): WorkspaceUiState {
    switch (intent.kind) {
        case 'preserve':
            return state;
        case 'select-file':
            return withSelectedFile(state, intent.fileId);
        case 'focus-source':
            return withFocusedSource(state, intent.fileId, intent.target, intent.flashTarget);
    }
}

function applyRemovedFiles(
    state: WorkspaceUiState,
    fileIds: string[],
    remainingIds: string[],
): WorkspaceUiState {
    const removedIds = new Set(fileIds);
    const focusedSource =
        state.focusedSource && removedIds.has(state.focusedSource.fileId)
            ? null
            : state.focusedSource;

    if (!state.selectedId || !removedIds.has(state.selectedId)) {
        return focusedSource === state.focusedSource ? state : { ...state, focusedSource };
    }

    if (remainingIds.length === 0) {
        return {
            ...state,
            selectedId: null,
            selectedFileScrollKey: undefined,
            focusedSource,
        };
    }

    return withSelectedFile({ ...state, focusedSource }, remainingIds[0]);
}

function createWorkspaceStoreActions(
    set: WorkspaceStoreApi['setState'],
    get: WorkspaceStoreApi['getState'],
): WorkspaceStoreActions {
    return {
        addSourceFiles(files) {
            if (!files.length) return [];
            set((state) => ({
                source: { ...state.source, files: [...state.source.files, ...files] },
            }));
            return files;
        },
        removeSourceFiles(fileIds) {
            const idsToRemove = new Set(fileIds);
            const currentFiles = get().source.files;
            if (!idsToRemove.size) {
                return {
                    removedFiles: [],
                    remainingIds: currentFiles.map((file) => file.id),
                };
            }

            const removedFiles = currentFiles.filter((file) => idsToRemove.has(file.id));
            if (!removedFiles.length) {
                return {
                    removedFiles: [],
                    remainingIds: currentFiles.map((file) => file.id),
                };
            }

            const remainingFiles = currentFiles.filter((file) => !idsToRemove.has(file.id));
            set((state) => ({
                source: {
                    files: remainingFiles,
                    editsByFile: withoutFileEdits(state.source.editsByFile, idsToRemove),
                },
            }));

            return {
                removedFiles,
                remainingIds: remainingFiles.map((file) => file.id),
            };
        },
        clearSourceFiles() {
            const files = get().source.files;
            if (!files.length) return [];
            set({ source: EMPTY_SOURCE_SESSION_STATE });
            return files;
        },
        reorderFiles(fromId, toId) {
            set((state) => ({
                source: {
                    ...state.source,
                    files: reorderById(state.source.files, fromId, toId),
                },
            }));
        },
        updateFilePageCount(fileId, count) {
            set((state) => ({
                source: {
                    ...state.source,
                    files: state.source.files.map((file) =>
                        file.id === fileId ? { ...file, pageCount: count } : file,
                    ),
                },
            }));
        },
        rotateSourcePage(fileId, target, direction) {
            const { source } = get();
            const file = findCompatibleRotationFile(source.files, fileId, target);
            if (!file) return null;

            const edits = FileEditsVO.applyRotation(source.editsByFile[file.id], target, direction);
            set((state) => ({
                source: {
                    ...state.source,
                    editsByFile: {
                        ...state.source.editsByFile,
                        [file.id]: edits,
                    },
                },
            }));
            return { file, target, edits };
        },
        addAllPagesForFile(file) {
            if (file.kind === 'image') {
                set((state) => ({
                    composition: setImageIncluded(state.composition, file.id, true),
                }));
                return;
            }

            const pages = allPdfPagesForFile(file);
            if (!pages.length) return;
            set((state) => ({
                composition: setPdfSelection(state.composition, file.id, pages),
            }));
        },
        removePagesForFile(fileId) {
            set((state) => ({
                composition: removeFileFromComposition(state.composition, fileId),
            }));
        },
        clearAllPages() {
            set({ composition: EMPTY_COMPOSITION_STATE });
        },
        togglePage(fileId, pageNum) {
            set((state) => ({
                composition: setPdfSelection(
                    state.composition,
                    fileId,
                    selectedPdfPagesWithToggle(
                        state.composition.selectedPdfPagesByFile,
                        fileId,
                        pageNum,
                    ),
                ),
            }));
        },
        setPdfPagesForFile(fileId, pages) {
            set((state) => ({
                composition: setPdfSelection(state.composition, fileId, pages),
            }));
        },
        setImageIncluded(fileId, included) {
            set((state) => ({
                composition: setImageIncluded(state.composition, fileId, included),
            }));
        },
        removeFinalPage(id) {
            set((state) => {
                const parsed = fromFinalPageId(id);
                if (parsed.kind === 'image') {
                    return {
                        composition: setImageIncluded(state.composition, parsed.fileId, false),
                    };
                }

                const current = state.composition.selectedPdfPagesByFile[parsed.fileId] ?? [];
                return {
                    composition: setPdfSelection(
                        state.composition,
                        parsed.fileId,
                        current.filter((pageNum) => pageNum !== parsed.pageNum),
                    ),
                };
            });
        },
        reorderFinalPages(fromId, toId) {
            set((state) => ({
                composition: {
                    ...state.composition,
                    pageOrder: reorderPageIds(state.composition.pageOrder, fromId, toId),
                },
            }));
        },
        moveFinalPageToIndex(id, targetIndex) {
            set((state) => ({
                composition: {
                    ...state.composition,
                    pageOrder: movePageIdToIndex(state.composition.pageOrder, id, targetIndex),
                },
            }));
        },
        selectAll(file) {
            if (file.kind === 'image') {
                set((state) => ({
                    composition: setImageIncluded(state.composition, file.id, true),
                }));
                return;
            }

            set((state) => ({
                composition: setPdfSelection(state.composition, file.id, allPdfPagesForFile(file)),
            }));
        },
        applyFilesAddedUi(files) {
            set((state) => ({
                ui: applySelectionIntent(
                    state.ui,
                    resolveSelectionAfterAdd(state.ui.selectedId, files),
                ),
            }));
        },
        selectFile(fileId) {
            set((state) => ({ ui: withSelectedFile(state.ui, fileId) }));
        },
        focusSource(fileId, target, flashTarget) {
            set((state) => ({
                ui: withFocusedSource(state.ui, fileId, target, flashTarget),
            }));
        },
        applyFileRemovedUi(fileId, remainingIds) {
            set((state) => ({
                ui: applyRemovedFiles(state.ui, [fileId], remainingIds),
            }));
        },
        applyFilesRemovedUi(fileIds, remainingIds) {
            set((state) => ({
                ui: applyRemovedFiles(state.ui, fileIds, remainingIds),
            }));
        },
        clearUi() {
            set({ ui: EMPTY_WORKSPACE_UI_STATE });
        },
    };
}

export function createWorkspaceStore(): WorkspaceStoreApi {
    return createStore<WorkspaceStore>((set, get) => ({
        ...initialWorkspaceStoreState,
        ...createWorkspaceStoreActions(set, get),
    }));
}
