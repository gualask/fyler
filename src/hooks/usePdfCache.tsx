import { createContext, useContext } from 'react';

import type { QuarterTurn, SourceFile } from '../domain';

export type PdfRenderVariant = 'thumb' | 'preview';

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
    releaseFile: (fileId: string) => void;
};

export const PdfCacheContext = createContext<PdfCacheContextType | null>(null);

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

export function usePdfCache(): PdfCacheContextType {
    const ctx = useContext(PdfCacheContext);
    if (!ctx) throw new Error('usePdfCache must be used within PdfCacheProvider');
    return ctx;
}
