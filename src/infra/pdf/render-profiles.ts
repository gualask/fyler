import type { FileEdits, QuarterTurn } from '@/shared/domain';
import { emptyFileEdits, getPdfPageQuarterTurn } from '@/shared/domain/file-edits';
import type { PdfRenderRequest } from './pdf-cache.hook';

/** Use device pixel ratio for thumbnails, capped to avoid heavy CPU/memory usage. */
const THUMB_DENSITY = typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 2);

function withRotation(
    pageNum: number,
    quarterTurns: QuarterTurn,
    request: Omit<PdfRenderRequest, 'pageNum' | 'quarterTurns'>,
): PdfRenderRequest {
    return {
        pageNum,
        quarterTurns,
        ...request,
    };
}

export function buildThumbnailRenderRequest(
    pageNum: number,
    edits: FileEdits | undefined,
): PdfRenderRequest {
    return withRotation(pageNum, getPdfPageQuarterTurn(edits ?? emptyFileEdits(), pageNum), {
        variant: 'thumb',
        width: 120,
        quality: 0.88,
        density: THUMB_DENSITY,
    });
}

/** Convenience helper for batch thumbnail prefetching. */
export function buildThumbnailRenderRequests(
    pageNums: number[],
    edits: FileEdits | undefined,
): PdfRenderRequest[] {
    return pageNums.map((pageNum) => buildThumbnailRenderRequest(pageNum, edits));
}

/** Render profile for the main page preview. */
export function buildPreviewRenderRequest(
    pageNum: number,
    edits: FileEdits | undefined,
): PdfRenderRequest {
    return withRotation(pageNum, getPdfPageQuarterTurn(edits ?? emptyFileEdits(), pageNum), {
        variant: 'preview',
        width: 900,
        quality: 0.92,
        density: 1,
    });
}
