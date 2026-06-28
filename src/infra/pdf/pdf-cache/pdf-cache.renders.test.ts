/// <reference types="node" />

import assert from 'node:assert/strict';
import { QueryCache, QueryClient, QueryObserver } from '@tanstack/react-query';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';
import type { SourceFile } from '@/shared/domain';
import type { PdfRenderRequest } from '../pdf-cache.hook';
import { renderPdfPage } from '../render';
import {
    getPageAspectRatio,
    pdfRenderQueryKey,
    pdfRenderQueryOptions,
    registerPdfRenderQueryCacheCleanup,
    releasePdfRenderQueries,
} from './pdf-cache.renders';

vi.mock('../render', () => ({
    renderPdfPage: vi.fn(async () => ({
        blob: new Blob(['pdf-render']),
        aspectRatio: 0.75,
    })),
}));

const PDF_FILE: SourceFile = {
    id: 'pdf-1',
    originalPath: '/tmp/source.pdf',
    name: 'source.pdf',
    byteSize: 100,
    pageCount: 3,
    kind: 'pdf',
};

const REQUEST: PdfRenderRequest = {
    pageNum: 2,
    quarterTurns: 1,
    variant: 'preview',
    width: 900,
    quality: 0.92,
    density: 1,
};

let createObjectUrl: typeof URL.createObjectURL;
let revokeObjectUrl: typeof URL.revokeObjectURL;
let createdUrls: string[];
let revokedUrls: string[];
let queryClient: QueryClient;

function createPdfRenderQueryClient() {
    const queryCache = new QueryCache();
    registerPdfRenderQueryCacheCleanup(queryCache);
    return new QueryClient({
        queryCache,
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
}

function getPdfDocument(): Promise<PDFDocumentProxy> {
    return Promise.resolve({} as PDFDocumentProxy);
}

beforeEach(() => {
    vi.clearAllMocks();
    createdUrls = [];
    revokedUrls = [];
    queryClient = createPdfRenderQueryClient();
    createObjectUrl = URL.createObjectURL;
    revokeObjectUrl = URL.revokeObjectURL;
    URL.createObjectURL = ((blob: Blob | MediaSource) => {
        const url = `blob:pdf-render-${createdUrls.length + 1}`;
        if (blob instanceof Blob) {
            createdUrls.push(url);
        }
        return url;
    }) as typeof URL.createObjectURL;
    URL.revokeObjectURL = ((url: string) => {
        revokedUrls.push(url);
    }) as typeof URL.revokeObjectURL;
});

afterEach(() => {
    queryClient.clear();
    URL.createObjectURL = createObjectUrl;
    URL.revokeObjectURL = revokeObjectUrl;
});

describe('pdf render query cache', () => {
    test('deduplicates concurrent renders for the same file and request', async () => {
        const options = pdfRenderQueryOptions({
            file: PDF_FILE,
            request: REQUEST,
            getPdfDocument,
        });

        const [first, second] = await Promise.all([
            queryClient.fetchQuery(options),
            queryClient.fetchQuery(options),
        ]);

        assert.equal(vi.mocked(renderPdfPage).mock.calls.length, 1);
        assert.deepEqual(createdUrls, ['blob:pdf-render-1']);
        assert.deepEqual(first, { objectUrl: 'blob:pdf-render-1', aspectRatio: 0.75 });
        assert.deepEqual(second, { objectUrl: 'blob:pdf-render-1', aspectRatio: 0.75 });
    });

    test('disabled observers receive data prefetched by requestRenders', () => {
        const options = pdfRenderQueryOptions({
            file: PDF_FILE,
            request: REQUEST,
            getPdfDocument,
        });
        const observer = new QueryObserver(queryClient, { ...options, enabled: false });
        const unsubscribe = observer.subscribe(() => undefined);

        queryClient.setQueryData(options.queryKey, {
            objectUrl: 'blob:prefetched',
            aspectRatio: 0.75,
        });

        assert.deepEqual(observer.getCurrentResult().data, {
            objectUrl: 'blob:prefetched',
            aspectRatio: 0.75,
        });

        unsubscribe();
    });

    test('reads page aspect ratio from any matching render variant', () => {
        queryClient.setQueryData(pdfRenderQueryKey(PDF_FILE.id, REQUEST), {
            objectUrl: 'blob:preview',
            aspectRatio: 0.75,
        });

        assert.equal(getPageAspectRatio(queryClient, PDF_FILE.id, 2, 1), 0.75);
        assert.equal(getPageAspectRatio(queryClient, PDF_FILE.id, 2, 0), undefined);
    });

    test('releases only render queries for the requested file', () => {
        const otherRequest = { ...REQUEST, pageNum: 1 };
        queryClient.setQueryData(pdfRenderQueryKey(PDF_FILE.id, REQUEST), {
            objectUrl: 'blob:pdf-1',
            aspectRatio: 0.75,
        });
        queryClient.setQueryData(pdfRenderQueryKey('pdf-2', otherRequest), {
            objectUrl: 'blob:pdf-2',
            aspectRatio: 0.5,
        });

        releasePdfRenderQueries(queryClient, PDF_FILE.id);

        assert.deepEqual(revokedUrls, ['blob:pdf-1']);
        assert.equal(queryClient.getQueryData(pdfRenderQueryKey(PDF_FILE.id, REQUEST)), undefined);
        assert.deepEqual(queryClient.getQueryData(pdfRenderQueryKey('pdf-2', otherRequest)), {
            objectUrl: 'blob:pdf-2',
            aspectRatio: 0.5,
        });
    });

    test('revokes replaced and removed render object URLs', () => {
        const queryKey = pdfRenderQueryKey(PDF_FILE.id, REQUEST);
        queryClient.setQueryData(queryKey, {
            objectUrl: 'blob:first',
            aspectRatio: 0.75,
        });
        queryClient.setQueryData(queryKey, {
            objectUrl: 'blob:second',
            aspectRatio: 0.75,
        });
        releasePdfRenderQueries(queryClient);

        assert.deepEqual(revokedUrls, ['blob:first', 'blob:second']);
    });
});
