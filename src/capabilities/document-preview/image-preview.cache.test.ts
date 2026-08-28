/// <reference types="node" />

import assert from 'node:assert/strict';
import { QueryCache, QueryClient, QueryObserver } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';
import {
    IMAGE_PREVIEW_GC_TIME_MS,
    imagePreviewQueryOptions,
    registerImagePreviewQueryCacheCleanup,
} from './image-preview.cache';
import type { DocumentPreviewPort } from './preview.types';

let createObjectUrl: typeof URL.createObjectURL;
let revokeObjectUrl: typeof URL.revokeObjectURL;
let createdUrls: string[];
let revokedUrls: string[];
let queryClient: QueryClient;

const nativeLikePreviewPort: DocumentPreviewPort = {
    getSourceUrl: (path) => path,
    getImageExportPreviewLayout: async () => {
        throw new Error('not implemented');
    },
    getImagePreview: async () => null,
};

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}

function createImagePreviewQueryClient() {
    const queryCache = new QueryCache();
    registerImagePreviewQueryCacheCleanup(queryCache);
    return new QueryClient({
        queryCache,
        defaultOptions: {
            queries: {
                retry: false,
            },
        },
    });
}

beforeEach(() => {
    vi.useFakeTimers();
    queryClient = createImagePreviewQueryClient();
    createdUrls = [];
    revokedUrls = [];
    createObjectUrl = URL.createObjectURL;
    revokeObjectUrl = URL.revokeObjectURL;
    URL.createObjectURL = ((blob: Blob | MediaSource) => {
        const url = `blob:preview-${createdUrls.length + 1}`;
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
    vi.useRealTimers();
});

describe('image preview query cache', () => {
    test('keeps previews with different requested sizes in separate cache entries', async () => {
        const requests: number[] = [];
        const documentPreview = {
            ...nativeLikePreviewPort,
            getImagePreview: async ({ maxSide }) => {
                requests.push(maxSide ?? 0);
                return [1, 2, 3];
            },
        } satisfies DocumentPreviewPort;

        await queryClient.fetchQuery(
            imagePreviewQueryOptions(
                { fileId: 'image-sized', originalPath: '/tmp/image.jpg', maxSide: 96 },
                documentPreview,
            ),
        );
        await queryClient.fetchQuery(
            imagePreviewQueryOptions(
                { fileId: 'image-sized', originalPath: '/tmp/image.jpg', maxSide: 1600 },
                documentPreview,
            ),
        );

        assert.deepEqual(requests, [96, 1600]);
    });

    test('shares one object URL across multiple consumers of the same image', async () => {
        const image = { fileId: 'image-1', originalPath: '/tmp/image.jpg' };
        let requests = 0;
        const documentPreview = {
            ...nativeLikePreviewPort,
            getImagePreview: async () => {
                requests += 1;
                return [1, 2, 3];
            },
        } satisfies DocumentPreviewPort;
        const options = imagePreviewQueryOptions(image, documentPreview);

        const [first, second] = await Promise.all([
            queryClient.fetchQuery(options),
            queryClient.fetchQuery(options),
        ]);

        assert.equal(requests, 1);
        assert.deepEqual(createdUrls, ['blob:preview-1']);
        assert.deepEqual(first, { objectUrl: 'blob:preview-1', status: 'ready' });
        assert.deepEqual(second, { objectUrl: 'blob:preview-1', status: 'ready' });

        await vi.advanceTimersByTimeAsync(IMAGE_PREVIEW_GC_TIME_MS);
        assert.deepEqual(revokedUrls, ['blob:preview-1']);

        const third = await queryClient.fetchQuery(options);
        assert.equal(requests, 2);
        assert.deepEqual(third, { objectUrl: 'blob:preview-2', status: 'ready' });
    });

    test('keeps a released preview alive when it is reacquired before cleanup', async () => {
        const image = { fileId: 'image-2', originalPath: '/tmp/image.jpg' };
        let requests = 0;
        const documentPreview = {
            ...nativeLikePreviewPort,
            getImagePreview: async () => {
                requests += 1;
                return new Uint8Array([4, 5, 6]);
            },
        } satisfies DocumentPreviewPort;
        const options = imagePreviewQueryOptions(image, documentPreview);

        const firstObserver = new QueryObserver(queryClient, options);
        const unsubscribeFirst = firstObserver.subscribe(() => undefined);
        const first = await queryClient.fetchQuery(options);

        unsubscribeFirst();
        await vi.advanceTimersByTimeAsync(IMAGE_PREVIEW_GC_TIME_MS / 2);

        const secondObserver = new QueryObserver(queryClient, options);
        const unsubscribeSecond = secondObserver.subscribe(() => undefined);
        const second = await queryClient.fetchQuery(options);
        await vi.advanceTimersByTimeAsync(IMAGE_PREVIEW_GC_TIME_MS);

        assert.equal(requests, 1);
        assert.deepEqual(revokedUrls, []);
        assert.deepEqual(first, { objectUrl: 'blob:preview-1', status: 'ready' });
        assert.deepEqual(second, { objectUrl: 'blob:preview-1', status: 'ready' });

        unsubscribeSecond();
        await vi.advanceTimersByTimeAsync(IMAGE_PREVIEW_GC_TIME_MS);
        assert.deepEqual(revokedUrls, ['blob:preview-1']);
    });

    test('falls back when no generated preview is available', async () => {
        const image = { fileId: 'image-3', originalPath: '/tmp/image.jpg' };
        const documentPreview = {
            ...nativeLikePreviewPort,
            getImagePreview: async () => null,
        } satisfies DocumentPreviewPort;

        const result = await queryClient.fetchQuery(
            imagePreviewQueryOptions(image, documentPreview),
        );

        assert.deepEqual(createdUrls, []);
        assert.deepEqual(result, { objectUrl: null, status: 'fallback' });
    });

    test('falls back when generated preview bytes are empty', async () => {
        const image = { fileId: 'image-4', originalPath: '/tmp/image.jpg' };
        const documentPreview = {
            ...nativeLikePreviewPort,
            getImagePreview: async () => [],
        } satisfies DocumentPreviewPort;

        const result = await queryClient.fetchQuery(
            imagePreviewQueryOptions(image, documentPreview),
        );

        assert.deepEqual(createdUrls, []);
        assert.deepEqual(result, { objectUrl: null, status: 'fallback' });
    });

    test('revokes the previous object URL when preview data is replaced', async () => {
        const image = { fileId: 'image-5', originalPath: '/tmp/image.jpg' };
        const documentPreview = {
            ...nativeLikePreviewPort,
            getImagePreview: async () => new ArrayBuffer(3),
        } satisfies DocumentPreviewPort;
        const options = imagePreviewQueryOptions(image, documentPreview);

        await queryClient.fetchQuery(options);
        queryClient.setQueryData(options.queryKey, {
            objectUrl: 'blob:preview-replacement',
            status: 'ready',
        });
        await flushPromises();

        assert.deepEqual(revokedUrls, ['blob:preview-1']);

        queryClient.clear();
        assert.deepEqual(revokedUrls, ['blob:preview-1', 'blob:preview-replacement']);
    });
});
