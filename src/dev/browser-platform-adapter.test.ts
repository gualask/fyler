/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const { browserPlatformAdapter } = await import('./browser-platform-adapter.ts');

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
    const samplePdf = readFileSync(
        new URL('../../public/fixtures/sample-document.pdf', import.meta.url),
    );
    const restoreGlobals = installBrowserGlobals([
        new File(['image'], 'sample-image.jpg', { type: 'image/jpeg' }),
        new File([samplePdf], 'sample-document.pdf', { type: 'application/pdf' }),
        new File(['notes'], 'notes.txt', { type: 'text/plain' }),
    ]);

    try {
        const result = await browserPlatformAdapter.openFilesDialog('Documents and images');

        assert.equal(result.files.length, 2);
        assert.deepEqual(result.files[0], {
            id: result.files[0]?.id,
            originalPath: 'blob:sample-image.jpg',
            name: 'sample-image.jpg',
            byteSize: 5,
            pageCount: 1,
            kind: 'image',
        });
        assert.deepEqual(result.files[1], {
            id: result.files[1]?.id,
            originalPath: 'blob:sample-document.pdf',
            name: 'sample-document.pdf',
            byteSize: samplePdf.byteLength,
            pageCount: 5,
            kind: 'pdf',
        });
        assert.match(result.files[0]?.id ?? '', /^web-/);
        assert.match(result.files[1]?.id ?? '', /^web-/);
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

await assert.doesNotReject(browserPlatformAdapter.releaseSources(['source-1']));
assert.equal(
    browserPlatformAdapter.getPreviewUrl('/fixtures/sample-document.pdf'),
    '/fixtures/sample-document.pdf',
);
assert.equal(
    browserPlatformAdapter.getPreviewUrl('blob:sample-document.pdf'),
    'blob:sample-document.pdf',
);
