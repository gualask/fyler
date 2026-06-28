/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';
import { createStubPlatformAdapter } from './platform-adapter.test-utils.ts';

let invokeCalls: Array<{ command: string; payload: unknown }> = [];
let platform: typeof import('./index.ts');

beforeEach(async () => {
    invokeCalls = [];
    vi.resetModules();

    vi.doMock('@tauri-apps/api/window', () => ({
        getCurrentWindow: () => {
            throw new TypeError("Cannot read properties of undefined (reading 'metadata')");
        },
        LogicalSize: class LogicalSize {
            width: number;
            height: number;

            constructor(width: number, height: number) {
                this.width = width;
                this.height = height;
            }
        },
    }));

    vi.doMock('@tauri-apps/api/core', () => ({
        convertFileSrc: (path: string) => path,
        invoke: async (command: string, payload?: unknown) => {
            invokeCalls.push({ command, payload });
            return undefined;
        },
    }));

    platform = await import('./index.ts');
});

afterEach(() => {
    platform.resetPlatformAdapter();
    vi.doUnmock('@tauri-apps/api/window');
    vi.doUnmock('@tauri-apps/api/core');
});

describe('platform facade', () => {
    test('surfaces native adapter errors without throwing synchronously', async () => {
        let promise: Promise<void> | undefined;

        assert.doesNotThrow(() => {
            promise = platform.windowSetMinSize(1100, 600);
        });

        assert.ok(promise);
        await assert.rejects(promise, /Cannot read properties of undefined \(reading 'metadata'\)/);
    });

    test('delegates to the current platform adapter when overridden', async () => {
        const adapter = createStubPlatformAdapter({
            openFilesDialog: async () => ({
                files: [],
                passwordRequired: [],
                skippedErrors: [{ name: 'stub.pdf', reason: 'unsupported_format' }],
            }),
            getImagePreview: async (fileId) => ({
                mimeType: 'image/jpeg',
                bytes: [1, 2, 3],
                width: fileId === 'image-1' ? 1600 : 1,
                height: 900,
            }),
            getSourceUrl: (path) => `source:${path}`,
        });

        platform.setPlatformAdapter(adapter);
        const result = await platform.openFilesDialog('Documents and images');
        const preview = await platform.getImagePreview('image-1');

        assert.equal(invokeCalls.length, 0);
        assert.deepEqual(result, {
            files: [],
            passwordRequired: [],
            skippedErrors: [{ name: 'stub.pdf', reason: 'unsupported_format' }],
        });
        assert.deepEqual(preview, {
            mimeType: 'image/jpeg',
            bytes: [1, 2, 3],
            width: 1600,
            height: 900,
        });
        assert.equal(
            platform.getSourceUrl('/fixtures/sample-document.pdf'),
            'source:/fixtures/sample-document.pdf',
        );
    });

    test('delegates protected PDF unlock to the current platform adapter', async () => {
        const adapter = createStubPlatformAdapter({
            unlockPdfSource: async (path, password) => ({
                id: 'source-1',
                originalPath: path,
                name: password === 'secret' ? 'protected.pdf' : 'unexpected.pdf',
                byteSize: 128,
                pageCount: 2,
                kind: 'pdf',
            }),
        });

        platform.setPlatformAdapter(adapter);
        const result = await platform.unlockPdfSource('/tmp/protected.pdf', 'secret');

        assert.deepEqual(result, {
            id: 'source-1',
            originalPath: '/tmp/protected.pdf',
            name: 'protected.pdf',
            byteSize: 128,
            pageCount: 2,
            kind: 'pdf',
        });
    });
});
