import { createContext, useContext } from 'react';

import type { QuarterTurn, SourceFile } from '@/domain';

export type PdfRenderVariant = 'thumb' | 'preview';

/**
 * A single render request for a PDF page.
 *
 * `width` is the target output width (in CSS pixels) for the rendered image.
 * `density` is an optional multiplier to render at higher resolution (useful on HiDPI screens).
 */
export type PdfRenderRequest = {
    pageNum: number;
    quarterTurns: QuarterTurn;
    variant: PdfRenderVariant;
    width: number;
    quality: number;
    density?: number;
};

export type PdfCacheContextType = {
    requestRenders: (file: SourceFile, requests: PdfRenderRequest[]) => void;
    getRender: (fileId: string, request: PdfRenderRequest) => string | undefined;
    subscribeRender: (
        fileId: string,
        request: PdfRenderRequest,
        listener: () => void,
    ) => () => void;
    getPageAspectRatio: (
        fileId: string,
        pageNum: number,
        quarterTurns: QuarterTurn,
    ) => number | undefined;
    releaseFile: (fileId: string) => void;
};

export const PdfCacheContext = createContext<PdfCacheContextType | null>(null);

/** Stable cache key for a render request. Any change here must keep backward-compat with existing cache usage. */
export function getPdfRenderCacheKey(request: PdfRenderRequest): string {
    return [
        request.variant,
        request.pageNum,
        request.quarterTurns,
        request.width,
        request.quality,
        request.density ?? 1,
    ].join(':');
}

/** Cache key for per-page aspect ratio values (rotation-aware). */
export function getAspectRatioCacheKey(pageNum: number, quarterTurns: QuarterTurn): string {
    return `${pageNum}:${quarterTurns}`;
}

/** Hook to access the shared PDF render cache. */
export function usePdfCache(): PdfCacheContextType {
    const ctx = useContext(PdfCacheContext);
    if (!ctx) throw new Error('usePdfCache must be used within PdfCacheProvider');
    return ctx;
}
