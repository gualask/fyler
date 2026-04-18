/// <reference types="node" />

import assert from 'node:assert/strict';
import { mock } from 'node:test';
import type { PlatformAdapter } from './platform-adapter.ts';

let invokeCalls: Array<{ command: string; payload: unknown }> = [];

const invokeImpl = async (command: string, payload?: unknown) => {
    invokeCalls.push({ command, payload });
    return undefined;
};

mock.module('@tauri-apps/api/window', {
    namedExports: {
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
    },
});

mock.module('@tauri-apps/api/core', {
    namedExports: {
        convertFileSrc: (path: string) => path,
        invoke: invokeImpl,
    },
});

const platform = await import('./index.ts');

function createStubPlatformAdapter(overrides: Partial<PlatformAdapter> = {}): PlatformAdapter {
    return {
        openFilesDialog: async () => ({ files: [], skippedErrors: [] }),
        savePDFDialog: async () => '',
        saveTextFile: async () => '',
        mergePDFs: async () => {
            throw new Error('not implemented');
        },
        getAppMetadata: async () => ({
            appName: 'Fyler',
            version: 'test',
            identifier: 'test',
            platform: 'test',
            arch: 'test',
        }),
        openExternalUrl: async () => undefined,
        openFilesFromPaths: async () => ({ files: [], skippedErrors: [] }),
        releaseSources: async () => undefined,
        getImageExportPreviewLayout: async () => {
            throw new Error('not implemented');
        },
        getPreviewUrl: (path) => path,
        windowGetLogicalSize: async () => ({ width: 0, height: 0 }),
        windowSetSize: async () => undefined,
        windowSetAlwaysOnTop: async () => undefined,
        windowSetMinSize: async () => undefined,
        windowSetMaxSize: async () => undefined,
        windowSetMaximizable: async () => undefined,
        ...overrides,
    };
}

{
    let promise: Promise<void> | undefined;

    assert.doesNotThrow(() => {
        promise = platform.windowSetMinSize(1100, 600);
    });

    assert.ok(promise);
    await assert.rejects(promise, /Cannot read properties of undefined \(reading 'metadata'\)/);
}

{
    invokeCalls = [];
    const adapter = createStubPlatformAdapter({
        openFilesDialog: async () => ({
            files: [],
            skippedErrors: [{ name: 'stub.pdf', reason: 'unsupported_format' }],
        }),
        getPreviewUrl: (path) => `preview:${path}`,
    });

    try {
        platform.setPlatformAdapter(adapter);
        const result = await platform.openFilesDialog('Documents and images');

        assert.equal(invokeCalls.length, 0);
        assert.deepEqual(result, {
            files: [],
            skippedErrors: [{ name: 'stub.pdf', reason: 'unsupported_format' }],
        });
        assert.equal(
            platform.getPreviewUrl('/fixtures/sample-document.pdf'),
            'preview:/fixtures/sample-document.pdf',
        );
    } finally {
        platform.resetPlatformAdapter();
    }
}
