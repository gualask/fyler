import type { PdfRenderRequest } from '@/infrastructure/pdfjs';
import type { FileEdits } from '@/modules/merge/model';
import { FileEditsVO } from '@/modules/merge/model';
import type { QuarterTurn } from '@/shared/domain';

const THUMB_DENSITY =
    typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

function withRotation(
    pageNum: number,
    quarterTurns: QuarterTurn,
    request: Omit<PdfRenderRequest, 'pageNum' | 'quarterTurns'>,
): PdfRenderRequest {
    return { pageNum, quarterTurns, ...request };
}

export function buildThumbnailRenderRequest(
    pageNum: number,
    edits: FileEdits | undefined,
): PdfRenderRequest {
    return withRotation(pageNum, FileEditsVO.getPdfPageQuarterTurn(edits, pageNum), {
        variant: 'thumb',
        width: 352,
        quality: 0.86,
        density: THUMB_DENSITY,
    });
}

export function buildPreviewRenderRequest(
    pageNum: number,
    edits: FileEdits | undefined,
): PdfRenderRequest {
    return withRotation(pageNum, FileEditsVO.getPdfPageQuarterTurn(edits, pageNum), {
        variant: 'preview',
        width: 900,
        quality: 0.92,
        density: 1,
    });
}
