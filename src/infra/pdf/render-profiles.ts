import type { FileEdits, QuarterTurn } from '@/shared/domain';
import { emptyFileEdits, getPdfPageQuarterTurn } from '@/shared/domain/file-edits';
import type { PdfRenderRequest } from './pdf-cache.hook';

/** Use device pixel ratio for thumbnails, capped to avoid heavy CPU/memory usage. */
const THUMB_DENSITY =
    typeof window === 'undefined' ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);

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
        // Canonical thumbnail profile. Keep this large enough to avoid upscaling blur
        // in responsive thumbnail UIs (e.g. Final Document card layout).
        width: 352,
        quality: 0.86,
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
