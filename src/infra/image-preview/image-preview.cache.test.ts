/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';
import { resetPlatformAdapter, setPlatformAdapter } from '@/infra/platform';
import { createStubPlatformAdapter } from '@/infra/platform/platform-adapter.test-utils';
import { resetImagePreviewCacheForTest, retainImagePreview } from './image-preview.cache';

const RELEASE_DELAY_MS = 100;

let createObjectUrl: typeof URL.createObjectURL;
let revokeObjectUrl: typeof URL.revokeObjectURL;
let createdUrls: string[];
let revokedUrls: string[];

async function flushPromises() {
    await Promise.resolve();
    await Promise.resolve();
}

beforeEach(() => {
    vi.useFakeTimers();
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
    resetImagePreviewCacheForTest();
    resetPlatformAdapter();
    URL.createObjectURL = createObjectUrl;
    URL.revokeObjectURL = revokeObjectUrl;
    vi.useRealTimers();
});

describe('image preview cache', () => {
    test('shares one object URL across multiple consumers of the same image', async () => {
        const image = {
            key: 'image-1:/tmp/image.jpg',
            fileId: 'image-1',
            sourceUrl: 'source:/tmp/image.jpg',
        };
        let requests = 0;
        setPlatformAdapter(
            createStubPlatformAdapter({
                getImagePreview: async () => {
                    requests += 1;
                    return {
                        mimeType: 'image/jpeg',
                        bytes: [1, 2, 3],
                        width: 1600,
                        height: 900,
                    };
                },
            }),
        );

        let first = retainImagePreview(image, () => undefined);
        const second = retainImagePreview(image, () => undefined);

        assert.deepEqual(first.getSnapshot(), { src: null, status: 'pending' });
        await flushPromises();

        assert.equal(requests, 1);
        assert.deepEqual(createdUrls, ['blob:preview-1']);
        assert.deepEqual(first.getSnapshot(), { src: 'blob:preview-1', status: 'ready' });
        assert.deepEqual(second.getSnapshot(), { src: 'blob:preview-1', status: 'ready' });

        first.release();
        await vi.advanceTimersByTimeAsync(RELEASE_DELAY_MS);
        assert.deepEqual(revokedUrls, []);

        second.release();
        await vi.advanceTimersByTimeAsync(RELEASE_DELAY_MS);
        assert.deepEqual(revokedUrls, ['blob:preview-1']);

        first = retainImagePreview(image, () => undefined);
        await flushPromises();
        assert.equal(requests, 2);
        assert.deepEqual(first.getSnapshot(), { src: 'blob:preview-2', status: 'ready' });
        first.release();
    });

    test('keeps a released preview alive when it is reacquired before cleanup', async () => {
        const image = {
            key: 'image-2:/tmp/image.jpg',
            fileId: 'image-2',
            sourceUrl: 'source:/tmp/image.jpg',
        };
        setPlatformAdapter(
            createStubPlatformAdapter({
                getImagePreview: async () => ({
                    mimeType: 'image/jpeg',
                    bytes: [4, 5, 6],
                    width: 1600,
                    height: 900,
                }),
            }),
        );

        const first = retainImagePreview(image, () => undefined);
        await flushPromises();
        first.release();

        await vi.advanceTimersByTimeAsync(RELEASE_DELAY_MS / 2);
        const second = retainImagePreview(image, () => undefined);
        await vi.advanceTimersByTimeAsync(RELEASE_DELAY_MS);

        assert.deepEqual(revokedUrls, []);
        assert.deepEqual(second.getSnapshot(), { src: 'blob:preview-1', status: 'ready' });

        second.release();
        await vi.advanceTimersByTimeAsync(RELEASE_DELAY_MS);
        assert.deepEqual(revokedUrls, ['blob:preview-1']);
    });

    test('falls back to source URL when no generated preview is available', async () => {
        const image = {
            key: 'image-3:/tmp/image.jpg',
            fileId: 'image-3',
            sourceUrl: 'source:/tmp/image.jpg',
        };
        setPlatformAdapter(createStubPlatformAdapter({ getImagePreview: async () => null }));

        const subscription = retainImagePreview(image, () => undefined);
        await flushPromises();

        assert.deepEqual(createdUrls, []);
        assert.deepEqual(subscription.getSnapshot(), {
            src: 'source:/tmp/image.jpg',
            status: 'fallback',
        });
        subscription.release();
    });
});
