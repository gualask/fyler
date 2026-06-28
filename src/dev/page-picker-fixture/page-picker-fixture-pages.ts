import type { FinalPage, SourceFile, SourceTarget } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import { SAMPLE_IMAGE_FILE, SAMPLE_PDF_FILE } from '../sample-assets.fixture-data';

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

export function buildPdfInitialPages(): FinalPage[] {
    return [1, 3, 5].map((pageNum) => pdfFinalPage(SAMPLE_PDF_FILE.id, pageNum));
}

export function buildImageInitialPages(): FinalPage[] {
    return [imageFinalPage(SAMPLE_IMAGE_FILE.id)];
}

export function togglePdfPage(
    finalPages: FinalPage[],
    fileId: string,
    pageNum: number,
): FinalPage[] {
    const pageId = toFinalPageId(fileId, { kind: 'pdf', pageNum });
    const exists = finalPages.some((page) => page.id === pageId);

    return exists
        ? finalPages.filter((page) => page.id !== pageId)
        : [...finalPages, pdfFinalPage(fileId, pageNum)];
}

export function pdfPages(fileId: string, pages: number[]): FinalPage[] {
    return pages.map((pageNum) => pdfFinalPage(fileId, pageNum));
}

export function imagePages(fileId: string, included: boolean): FinalPage[] {
    return included ? [imageFinalPage(fileId)] : [];
}

export function allPdfPageNumbers(file: SourceFile): number[] {
    const total = file.pageCount ?? 0;
    return Array.from({ length: total }, (_, index) => index + 1);
}

export function previewPage(file: SourceFile, target: SourceTarget): FinalPage {
    if (target.kind === 'image') {
        return imageFinalPage(file.id);
    }

    return pdfFinalPage(file.id, target.pageNum);
}
