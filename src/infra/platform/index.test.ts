/// <reference types="node" />

import assert from 'node:assert/strict';
import { mock } from 'node:test';

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

function toFileList(files: File[]): FileList {
    return Object.assign(files.slice(), {
        item: (index: number) => files[index] ?? null,
        length: files.length,
    }) as unknown as FileList;
}

function installBrowserGlobals(files: File[]) {
    const originalWindow = globalThis.window;
    const originalDocument = globalThis.document;
    const originalCreateObjectURL = globalThis.URL.createObjectURL;

    const input = {
        type: '',
        accept: '',
        multiple: false,
        files: toFileList(files),
        onchange: null as ((event: Event) => void) | null,
        click() {
            this.onchange?.(new Event('change'));
        },
        remove() {},
    };

    Object.assign(globalThis, {
        window: {
            location: { protocol: 'http:' },
        },
        document: {
            createElement: (tagName: string) => {
                assert.equal(tagName, 'input');
                return input;
            },
        },
    });
    globalThis.URL.createObjectURL = (file) => `blob:${(file as File).name}`;

    return () => {
        Object.assign(globalThis, {
            window: originalWindow,
            document: originalDocument,
        });
        globalThis.URL.createObjectURL = originalCreateObjectURL;
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
    const restoreGlobals = installBrowserGlobals([
        new File(['image'], 'sample-image.jpg', { type: 'image/jpeg' }),
        new File(['notes'], 'notes.txt', { type: 'text/plain' }),
    ]);

    try {
        const result = await platform.openFilesDialog('Documents and images');

        assert.equal(invokeCalls.length, 0);
        assert.equal(result.files.length, 1);
        assert.deepEqual(result.files[0], {
            id: result.files[0]?.id,
            originalPath: 'blob:sample-image.jpg',
            name: 'sample-image.jpg',
            byteSize: 5,
            pageCount: 1,
            kind: 'image',
        });
        assert.match(result.files[0]?.id ?? '', /^web-/);
        assert.deepEqual(result.skippedErrors, [
            {
                name: 'notes.txt',
                reason: 'unsupported_format',
            },
        ]);
    } finally {
        restoreGlobals();
    }
}

{
    invokeCalls = [];
    const restoreGlobals = installBrowserGlobals([]);

    try {
        await assert.doesNotReject(platform.releaseSources(['source-1']));
        assert.equal(invokeCalls.length, 0);
    } finally {
        restoreGlobals();
    }
}
