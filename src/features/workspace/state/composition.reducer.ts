import type { SourceFile } from '@/shared/domain';
import { parseFinalPageId, toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { uniqueSortedNumbers } from '@/shared/domain/utils/number-list';

export type CompositionState = {
    selectedPdfPagesByFile: Record<string, number[]>;
    includedImagesByFile: Record<string, true>;
    pageOrder: string[];
};

export type CompositionAction =
    | { type: 'set-pdf-selection'; fileId: string; pages: number[] }
    | { type: 'set-image-included'; fileId: string; included: boolean }
    | { type: 'remove-file'; fileId: string }
    | { type: 'reset' }
    | { type: 'reorder'; fromId: string; toId: string }
    | { type: 'move-to-index'; id: string; targetIndex: number };

export const initialCompositionState: CompositionState = {
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

export function allPdfPagesForFile(file: SourceFile): number[] {
    return Array.from({ length: file.pageCount }, (_, i) => i + 1);
}

function moveItem<T>(items: T[], fromIdx: number, toIdx: number): T[] {
    if (fromIdx === toIdx) return items;
    const next = [...items];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
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

export function compositionReducer(
    state: CompositionState,
    action: CompositionAction,
): CompositionState {
    switch (action.type) {
        case 'set-pdf-selection': {
            const pages = uniqueSortedNumbers(action.pages);
            const selectedPdfPagesByFile = { ...state.selectedPdfPagesByFile };

            if (pages.length === 0) {
                delete selectedPdfPagesByFile[action.fileId];
            } else {
                selectedPdfPagesByFile[action.fileId] = pages;
            }

            return {
                ...state,
                selectedPdfPagesByFile,
                pageOrder: reconcilePdfFileOrder(state.pageOrder, action.fileId, pages),
            };
        }
        case 'set-image-included': {
            const includedImagesByFile = { ...state.includedImagesByFile };
            const imageId = toImageFinalPageId(action.fileId);

            if (action.included) {
                includedImagesByFile[action.fileId] = true;
                if (state.pageOrder.includes(imageId)) {
                    return { ...state, includedImagesByFile };
                }
                return { ...state, includedImagesByFile, pageOrder: [...state.pageOrder, imageId] };
            }

            delete includedImagesByFile[action.fileId];
            return {
                ...state,
                includedImagesByFile,
                pageOrder: state.pageOrder.filter((id) => id !== imageId),
            };
        }
        case 'remove-file': {
            const selectedPdfPagesByFile = { ...state.selectedPdfPagesByFile };
            const includedImagesByFile = { ...state.includedImagesByFile };
            delete selectedPdfPagesByFile[action.fileId];
            delete includedImagesByFile[action.fileId];

            return {
                selectedPdfPagesByFile,
                includedImagesByFile,
                pageOrder: state.pageOrder.filter((id) => !id.startsWith(`${action.fileId}:`)),
            };
        }
        case 'reset':
            return initialCompositionState;
        case 'reorder':
            return {
                ...state,
                pageOrder: reorderPageIds(state.pageOrder, action.fromId, action.toId),
            };
        case 'move-to-index':
            return {
                ...state,
                pageOrder: movePageIdToIndex(state.pageOrder, action.id, action.targetIndex),
            };
        default:
            return state;
    }
}
