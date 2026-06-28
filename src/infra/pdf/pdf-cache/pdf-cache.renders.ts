import {
    type QueryCache,
    type QueryCacheNotifyEvent,
    type QueryClient,
    type QueryKey,
    queryOptions,
} from '@tanstack/react-query';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { QuarterTurn, SourceFile } from '@/shared/domain';
import { QuarterTurnVO } from '@/shared/domain/value-objects/quarter-turn.vo';
import type { PdfRenderRequest, PdfRenderVariant } from '../pdf-cache.hook';
import type { GetPdfDocument } from './pdf-cache.documents';

export type PdfRenderQueryKey = readonly [
    'pdf-render',
    string,
    number,
    QuarterTurn,
    PdfRenderVariant,
    number,
    number,
    number,
];

export type PdfRenderQueryData = {
    objectUrl: string;
    aspectRatio: number;
};

const PDF_RENDER_QUERY_ROOT = 'pdf-render';
const PDF_RENDER_QUERY_DEFAULTS = {
    gcTime: Infinity,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Infinity,
    structuralSharing: false,
} as const;

function maybeRevokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

function getPdfRenderObjectUrl(data: unknown): string | null {
    if (!data || typeof data !== 'object' || !('objectUrl' in data)) return null;
    const objectUrl = data.objectUrl;
    return typeof objectUrl === 'string' ? objectUrl : null;
}

function isPdfRenderQueryKey(queryKey: QueryKey): queryKey is PdfRenderQueryKey {
    return queryKey.length === 8 && queryKey[0] === PDF_RENDER_QUERY_ROOT;
}

function pdfRenderFileQueryKey(fileId: string) {
    return [PDF_RENDER_QUERY_ROOT, fileId] as const;
}

function pdfRenderAspectRatioQueryKey(fileId: string, pageNum: number, quarterTurns: QuarterTurn) {
    return [PDF_RENDER_QUERY_ROOT, fileId, pageNum, quarterTurns] as const;
}

export function pdfRenderQueryKey(fileId: string, request: PdfRenderRequest): PdfRenderQueryKey {
    return [
        PDF_RENDER_QUERY_ROOT,
        fileId,
        request.pageNum,
        request.quarterTurns,
        request.variant,
        request.width,
        request.quality,
        request.density ?? 1,
    ];
}

async function renderPdfPageObjectUrl(
    pdfDoc: PDFDocumentProxy,
    request: PdfRenderRequest,
): Promise<PdfRenderQueryData> {
    const { renderPdfPage } = await import('../render');
    const { blob, aspectRatio } = await renderPdfPage(
        pdfDoc,
        request.pageNum,
        request.width,
        request.quality,
        QuarterTurnVO.toDegrees(request.quarterTurns),
        request.density ?? 1,
    );
    return { objectUrl: URL.createObjectURL(blob), aspectRatio };
}

export function pdfRenderQueryOptions({
    file,
    request,
    getPdfDocument,
}: {
    file: SourceFile;
    request: PdfRenderRequest;
    getPdfDocument: GetPdfDocument;
}) {
    return queryOptions({
        ...PDF_RENDER_QUERY_DEFAULTS,
        queryKey: pdfRenderQueryKey(file.id, request),
        queryFn: async () => renderPdfPageObjectUrl(await getPdfDocument(file), request),
    });
}

/**
 * Enqueues render queries for a set of PDF page requests.
 *
 * TanStack Query owns request deduplication and cached render data. Cleanup is
 * explicit through `releasePdfRenderQueries()` and query-cache object URL hooks.
 */
export function requestRenders({
    file,
    requests,
    queryClient,
    getPdfDocument,
}: {
    file: SourceFile;
    requests: PdfRenderRequest[];
    queryClient: QueryClient;
    getPdfDocument: GetPdfDocument;
}) {
    if (file.kind !== 'pdf') return;

    for (const request of requests) {
        void queryClient.prefetchQuery(pdfRenderQueryOptions({ file, request, getPdfDocument }));
    }
}

/** Reads a cached, rotation-aware aspect ratio for a specific page, if available. */
export function getPageAspectRatio(
    queryClient: QueryClient,
    fileId: string,
    pageNum: number,
    quarterTurns: QuarterTurn,
) {
    const matches = queryClient.getQueriesData<PdfRenderQueryData>({
        queryKey: pdfRenderAspectRatioQueryKey(fileId, pageNum, quarterTurns),
    });
    return matches.find(([, data]) => data?.aspectRatio !== undefined)?.[1]?.aspectRatio;
}

export function releasePdfRenderQueries(queryClient: QueryClient, fileId?: string) {
    queryClient.removeQueries({
        queryKey: fileId ? pdfRenderFileQueryKey(fileId) : [PDF_RENDER_QUERY_ROOT],
    });
}

function updateTrackedUrl(trackedUrls: Map<string, string>, event: QueryCacheNotifyEvent) {
    if (!isPdfRenderQueryKey(event.query.queryKey)) return;

    const queryHash = event.query.queryHash;
    const currentUrl = getPdfRenderObjectUrl(event.query.state.data);
    const trackedUrl = trackedUrls.get(queryHash);

    if (event.type === 'removed') {
        maybeRevokeObjectUrl(trackedUrl ?? currentUrl);
        trackedUrls.delete(queryHash);
        return;
    }

    if (trackedUrl && trackedUrl !== currentUrl) {
        maybeRevokeObjectUrl(trackedUrl);
    }

    if (currentUrl) {
        trackedUrls.set(queryHash, currentUrl);
    } else {
        trackedUrls.delete(queryHash);
    }
}

export function registerPdfRenderQueryCacheCleanup(queryCache: QueryCache): () => void {
    const trackedUrls = new Map<string, string>();
    return queryCache.subscribe((event) => updateTrackedUrl(trackedUrls, event));
}
