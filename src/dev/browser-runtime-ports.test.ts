/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'vitest';

import {
    browserDocumentPreview,
    browserDocumentSources,
    browserRuntimePorts,
} from './browser-runtime-ports.ts';

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

describe('browser document adapters', () => {
    test('filters supported files and classifies unsupported ones', async () => {
        const samplePdf = readFileSync(
            new URL('../../public/fixtures/sample-document.pdf', import.meta.url),
        );
        const restoreGlobals = installBrowserGlobals([
            new File(['image'], 'sample-image.jpg', { type: 'image/jpeg' }),
            new File([samplePdf], 'sample-document.pdf', { type: 'application/pdf' }),
            new File(['notes'], 'notes.txt', { type: 'text/plain' }),
        ]);

        try {
            const result = await browserDocumentSources.openFilesDialog('Documents and images');

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
    });

    test('keeps browser-safe source URLs and releaseSources as no-ops', async () => {
        await assert.doesNotReject(browserDocumentSources.releaseSources(['source-1']));
        assert.equal(
            await browserDocumentPreview.getImagePreview({
                fileId: 'source-1',
                originalPath: '/fixtures/image.jpg',
            }),
            null,
        );
        assert.equal(
            browserDocumentPreview.getSourceUrl('/fixtures/sample-document.pdf'),
            '/fixtures/sample-document.pdf',
        );
        assert.equal(
            browserDocumentPreview.getSourceUrl('blob:sample-document.pdf'),
            'blob:sample-document.pdf',
        );
    });

    test('lays out populated front/back regions in the browser preview', async () => {
        const layout = await browserRuntimePorts.pageComposition.getPreviewLayout({
            layout: 'a4-stacked-halves',
            regions: {
                top: {
                    source: { fileId: 'front', kind: 'image' },
                    rotation: 0,
                },
                bottom: { source: null, rotation: 0 },
            },
        });

        assert.deepEqual(layout.regions.top.drawRect, layout.regions.top.regionRect);
        assert.equal(layout.regions.bottom.drawRect, null);
    });
});
