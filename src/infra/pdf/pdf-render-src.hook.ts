import { useQuery } from '@tanstack/react-query';

import type { SourceFile } from '@/shared/domain';
import { pdfRenderQueryOptions } from './pdf-cache/pdf-cache.renders';
import type { PdfRenderRequest } from './pdf-cache.hook';
import { usePdfCache } from './pdf-cache.hook';

const IDLE_PDF_FILE: SourceFile = {
    id: 'idle',
    originalPath: '',
    name: '',
    byteSize: 0,
    pageCount: null,
    kind: 'pdf',
};

const IDLE_RENDER_REQUEST: PdfRenderRequest = {
    pageNum: 0,
    quarterTurns: 0,
    variant: 'thumb',
    width: 1,
    quality: 1,
    density: 1,
};

export function usePdfRenderSrc(
    file: SourceFile | undefined,
    request: PdfRenderRequest | null,
): string | undefined {
    const { getPdfDocument } = usePdfCache();
    const pdfFile = file?.kind === 'pdf' ? file : null;
    const render = useQuery({
        ...pdfRenderQueryOptions({
            file: pdfFile ?? IDLE_PDF_FILE,
            request: request ?? IDLE_RENDER_REQUEST,
            getPdfDocument,
        }),
        enabled: false,
    });

    return pdfFile && request ? render.data?.objectUrl : undefined;
}
