import type { FinalPage, SourceFile } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';

function imageFinalPage(fileId: string): FinalPage {
    return {
        id: toFinalPageId(fileId, { kind: 'image' }),
        fileId,
        kind: 'image',
    };
}

function pdfFinalPage(fileId: string, pageNum: number): FinalPage {
    return {
        id: toFinalPageId(fileId, { kind: 'pdf', pageNum }),
        fileId,
        kind: 'pdf',
        pageNum,
    };
}

export function finalPagesForFile(file: SourceFile): FinalPage[] {
    if (file.kind === 'image') return [imageFinalPage(file.id)];

    const total = file.pageCount ?? 0;
    return Array.from({ length: total }, (_, index) => pdfFinalPage(file.id, index + 1));
}

export function finalPagesForPdfPages(fileId: string, pages: number[]): FinalPage[] {
    return pages.map((pageNum) => pdfFinalPage(fileId, pageNum));
}

export function replaceFinalPagesForFile(
    current: FinalPage[],
    fileId: string,
    replacement: FinalPage[],
): FinalPage[] {
    return [...current.filter((page) => page.fileId !== fileId), ...replacement];
}

export function setImageFinalPageIncluded(
    current: FinalPage[],
    fileId: string,
    included: boolean,
): FinalPage[] {
    return replaceFinalPagesForFile(current, fileId, included ? [imageFinalPage(fileId)] : []);
}

export function togglePdfFinalPage(
    current: FinalPage[],
    fileId: string,
    pageNum: number,
): FinalPage[] {
    const pageId = toFinalPageId(fileId, { kind: 'pdf', pageNum });
    return current.some((page) => page.id === pageId)
        ? current.filter((page) => page.id !== pageId)
        : [...current, pdfFinalPage(fileId, pageNum)];
}

export function reorderFinalPagesById(
    finalPages: FinalPage[],
    fromId: string,
    toId: string,
): FinalPage[] {
    const fromIndex = finalPages.findIndex((page) => page.id === fromId);
    const toIndex = finalPages.findIndex((page) => page.id === toId);

    if (fromIndex === -1 || toIndex === -1 || fromIndex === toIndex) {
        return finalPages;
    }

    const next = [...finalPages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(toIndex, 0, moved);
    return next;
}

export function moveFinalPageToIndexById(
    finalPages: FinalPage[],
    id: string,
    targetIndex: number,
): FinalPage[] {
    const fromIndex = finalPages.findIndex((page) => page.id === id);

    if (fromIndex === -1) {
        return finalPages;
    }

    const boundedIndex = Math.max(0, Math.min(targetIndex, finalPages.length - 1));
    if (boundedIndex === fromIndex) {
        return finalPages;
    }

    const next = [...finalPages];
    const [moved] = next.splice(fromIndex, 1);
    next.splice(boundedIndex, 0, moved);
    return next;
}
