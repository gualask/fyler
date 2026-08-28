import type { SourceFile } from '@/capabilities/document-sources';
import { uniqueSortedNumbers } from '@/shared/domain/utils/number-list';
import { parseFinalPageId, toFinalPageId } from './final-page-id';
import type {
    CompositionActions,
    CompositionState,
    WorkspaceStoreApi,
} from './workspace-store.types';

export const EMPTY_COMPOSITION_STATE: CompositionState = {
    selectedPdfPagesByFile: {},
    includedImagesByFile: {},
    pageOrder: [],
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
    return Array.from({ length: file.pageCount }, (_, index) => index + 1);
}

function moveItem<T>(items: T[], fromIndex: number, toIndex: number): T[] {
    if (fromIndex === toIndex) return items;
    const next = [...items];
    const [item] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, item);
    return next;
}

function reconcilePdfFileOrder(pageOrder: string[], fileId: string, pages: number[]): string[] {
    const idsForFile = pages.map((pageNum) => toPdfFinalPageId(fileId, pageNum));
    const idsForFileSet = new Set(idsForFile);
    const prefix = `${fileId}:`;
    const kept = pageOrder.filter((id) => !id.startsWith(prefix) || idsForFileSet.has(id));
    const keptSet = new Set(kept);
    return [...kept, ...idsForFile.filter((id) => !keptSet.has(id))];
}

function setPdfSelection(
    state: CompositionState,
    fileId: string,
    requestedPages: number[],
): CompositionState {
    const pages = uniqueSortedNumbers(requestedPages);
    const selectedPdfPagesByFile = { ...state.selectedPdfPagesByFile };
    if (pages.length === 0) delete selectedPdfPagesByFile[fileId];
    else selectedPdfPagesByFile[fileId] = pages;
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
        return state.pageOrder.includes(imageId)
            ? { ...state, includedImagesByFile }
            : { ...state, includedImagesByFile, pageOrder: [...state.pageOrder, imageId] };
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

function reorderPageIds(pageOrder: string[], fromId: string, toId: string): string[] {
    const fromIndex = pageOrder.indexOf(fromId);
    const toIndex = pageOrder.indexOf(toId);
    return fromIndex === -1 || toIndex === -1 ? pageOrder : moveItem(pageOrder, fromIndex, toIndex);
}

function movePageIdToIndex(pageOrder: string[], id: string, targetIndex: number): string[] {
    const fromIndex = pageOrder.indexOf(id);
    if (fromIndex === -1) return pageOrder;
    return moveItem(pageOrder, fromIndex, Math.min(Math.max(targetIndex, 0), pageOrder.length - 1));
}

function toggledPdfPages(state: CompositionState, fileId: string, pageNum: number): number[] {
    const current = state.selectedPdfPagesByFile[fileId] ?? [];
    return current.includes(pageNum)
        ? current.filter((entry) => entry !== pageNum)
        : [...current, pageNum];
}

export function createCompositionActions(set: WorkspaceStoreApi['setState']): CompositionActions {
    return {
        addAllPagesForFile(file) {
            if (file.kind === 'image') {
                set((state) => ({
                    composition: setImageIncluded(state.composition, file.id, true),
                }));
                return;
            }
            const pages = allPdfPagesForFile(file);
            if (pages.length) {
                set((state) => ({
                    composition: setPdfSelection(state.composition, file.id, pages),
                }));
            }
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
                    toggledPdfPages(state.composition, fileId, pageNum),
                ),
            }));
        },
        setPdfPagesForFile(fileId, pages) {
            set((state) => ({ composition: setPdfSelection(state.composition, fileId, pages) }));
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
    };
}
