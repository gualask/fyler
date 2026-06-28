import { createContext, useContext } from 'react';

import type { QuarterTurn, SourceFile } from '@/shared/domain';
import type { GetPdfDocument } from './pdf-cache/pdf-cache.documents';

export type PdfRenderVariant = 'thumb' | 'preview';

/**
 * PDF render cache access primitives.
 *
 * This module defines:
 * - The `PdfRenderRequest` shape and cache-key helpers
 * - The `PdfCacheContext` contract and the `usePdfCache()` hook
 */
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
    getPageAspectRatio: (
        fileId: string,
        pageNum: number,
        quarterTurns: QuarterTurn,
    ) => number | undefined;
    getPdfDocument: GetPdfDocument;
    setPdfPassword: (fileId: string, password: string) => void;
    releaseFile: (fileId: string) => void;
};

export const PdfCacheContext = createContext<PdfCacheContextType | null>(null);

/** Hook to access the shared PDF render cache. */
export function usePdfCache(): PdfCacheContextType {
    const ctx = useContext(PdfCacheContext);
    if (!ctx) throw new Error('usePdfCache must be used within PdfCacheProvider');
    return ctx;
}
