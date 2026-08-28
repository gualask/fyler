/// <reference types="node" />

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, test, vi } from 'vitest';

type InvokeCall = { command: string; payload: unknown };
type InvokeHandler = (command: string, payload: unknown) => Promise<unknown>;
type EventListener = (event: { payload: unknown }) => void;
type DragDropListener = (event: { payload: unknown }) => void;

let invokeCalls: InvokeCall[] = [];
let invokeHandler: InvokeHandler | undefined;
let nativeWindowError: Error | null = null;
let eventListeners = new Map<string, EventListener>();
let removedEventListeners: string[] = [];
let dragDropListener: DragDropListener | undefined;
let dragDropUnlistened = false;

beforeEach(() => {
    invokeCalls = [];
    invokeHandler = undefined;
    nativeWindowError = null;
    eventListeners = new Map();
    removedEventListeners = [];
    dragDropListener = undefined;
    dragDropUnlistened = false;
    vi.resetModules();
    vi.doMock('@tauri-apps/api/core', () => ({
        convertFileSrc: (path: string) => `asset:${path}`,
        invoke: async (command: string, payload?: unknown) => {
            invokeCalls.push({ command, payload });
            return invokeHandler?.(command, payload);
        },
    }));
    vi.doMock('@tauri-apps/api/window', () => ({
        getCurrentWindow: () => {
            if (nativeWindowError) throw nativeWindowError;
            return {
                innerSize: async () => ({
                    toLogical: (scale: number) => ({ width: scale, height: 2 }),
                }),
                scaleFactor: async () => 2,
                setSize: async () => undefined,
                setAlwaysOnTop: async () => undefined,
                setMinSize: async () => undefined,
            };
        },
        LogicalSize: class LogicalSize {
            constructor(
                public width: number,
                public height: number,
            ) {}
        },
    }));
    vi.doMock('@tauri-apps/api/event', () => ({
        listen: async (eventName: string, listener: EventListener) => {
            eventListeners.set(eventName, listener);
            return () => removedEventListeners.push(eventName);
        },
    }));
    vi.doMock('@tauri-apps/api/webview', () => ({
        getCurrentWebview: () => ({
            onDragDropEvent: async (listener: DragDropListener) => {
                dragDropListener = listener;
                return () => {
                    dragDropUnlistened = true;
                };
            },
        }),
    }));
});

afterEach(() => {
    vi.doUnmock('@tauri-apps/api/core');
    vi.doUnmock('@tauri-apps/api/window');
    vi.doUnmock('@tauri-apps/api/event');
    vi.doUnmock('@tauri-apps/api/webview');
});

describe('focused native adapters', () => {
    test('preserves source, preview, merge, and support command contracts', async () => {
        const { tauriDocumentPreview } = await import('./tauri-document-preview');
        const { tauriDocumentSources } = await import('./tauri-document-sources');
        const { tauriBatchCompression } = await import('./tauri-batch-compression');
        const { tauriMergeExport } = await import('./tauri-merge');
        const { tauriSupport } = await import('./tauri-support');

        await tauriDocumentSources.openFilesDialog('Documents and images');
        await tauriDocumentSources.openFilesFromPaths(['/tmp/example.pdf']);
        await tauriDocumentSources.unlockPdfSource('/tmp/protected.pdf', 'secret');
        await tauriDocumentSources.discardPendingSources(['/tmp/protected.pdf']);
        await tauriDocumentSources.releaseSources(['source-1']);
        await tauriDocumentPreview.getImageExportPreviewLayout('image-1', 'contain', 1);
        await tauriDocumentPreview.getImagePreview({
            fileId: 'image-1',
            originalPath: '/tmp/image.jpg',
            maxSide: 96,
        });
        assert.equal(tauriDocumentPreview.getSourceUrl('/tmp/image.jpg'), 'asset:/tmp/image.jpg');
        await tauriMergeExport.savePDFDialog('output.pdf', 'PDF');
        await tauriMergeExport.mergePDFs({
            pages: [],
            edits: {},
            outputPath: '/tmp/output.pdf',
            imageFit: 'contain',
        });
        await tauriBatchCompression.pickSources('PDFs and images');
        await tauriBatchCompression.inspectSources(['/tmp/dropped.png']);
        await tauriBatchCompression.pickDestination();
        await tauriBatchCompression.compress(
            {
                destinationPath: '/tmp/compressed',
                files: [{ sourceId: 'source-1', sourcePath: '/tmp/example.pdf' }],
                settings: {
                    preset: 'balanced',
                    imageOutputMode: 'keepSourceFormat',
                    jpegQuality: 92,
                    jpegBackground: [255, 255, 255],
                },
            },
            () => undefined,
        );
        await tauriSupport.getAppMetadata();
        await tauriSupport.saveTextFile('diagnostics.txt', 'Text', 'report');
        await tauriSupport.openExternalUrl('https://example.com');

        assert.deepEqual(invokeCalls, [
            { command: 'open_files_dialog', payload: { filterLabel: 'Documents and images' } },
            { command: 'open_files_from_paths', payload: { paths: ['/tmp/example.pdf'] } },
            {
                command: 'unlock_pdf_source',
                payload: { path: '/tmp/protected.pdf', password: 'secret' },
            },
            {
                command: 'discard_pending_sources',
                payload: { paths: ['/tmp/protected.pdf'] },
            },
            { command: 'release_sources', payload: { fileIds: ['source-1'] } },
            {
                command: 'get_image_export_preview_layout',
                payload: { fileId: 'image-1', imageFit: 'contain', quarterTurns: 1 },
            },
            {
                command: 'get_image_preview',
                payload: {
                    fileId: 'image-1',
                    originalPath: '/tmp/image.jpg',
                    maxSide: 96,
                },
            },
            {
                command: 'save_pdf_dialog',
                payload: { defaultFilename: 'output.pdf', filterLabel: 'PDF' },
            },
            {
                command: 'merge_pdfs',
                payload: {
                    req: {
                        pages: [],
                        edits: {},
                        outputPath: '/tmp/output.pdf',
                        imageFit: 'contain',
                    },
                },
            },
            {
                command: 'pick_batch_compression_sources',
                payload: { filterLabel: 'PDFs and images' },
            },
            {
                command: 'inspect_batch_compression_sources',
                payload: { paths: ['/tmp/dropped.png'] },
            },
            { command: 'pick_batch_compression_destination', payload: undefined },
            {
                command: 'compress_batch',
                payload: {
                    req: {
                        destinationPath: '/tmp/compressed',
                        files: [{ sourceId: 'source-1', sourcePath: '/tmp/example.pdf' }],
                        settings: {
                            preset: 'balanced',
                            imageOutputMode: 'keepSourceFormat',
                            jpegQuality: 92,
                            jpegBackground: [255, 255, 255],
                        },
                    },
                },
            },
            { command: 'get_app_metadata', payload: undefined },
            {
                command: 'save_text_file',
                payload: {
                    defaultFilename: 'diagnostics.txt',
                    filterLabel: 'Text',
                    content: 'report',
                },
            },
            { command: 'open_external_url', payload: { url: 'https://example.com' } },
        ]);
    });

    test('keeps window sizing and logical-scale behavior isolated to the window port', async () => {
        const { tauriApplicationWindow } = await import('./tauri-window');

        assert.deepEqual(await tauriApplicationWindow.getLogicalSize(), { width: 2, height: 2 });
        await assert.doesNotReject(tauriApplicationWindow.setSize(1100, 600));
        await assert.doesNotReject(tauriApplicationWindow.setAlwaysOnTop(true));
        await assert.doesNotReject(tauriApplicationWindow.setMinSize(900, 500));
    });

    test('sends confirmed PDF page rasters as raw IPC bytes', async () => {
        const { tauriPageComposition } = await import('./tauri-page-composition');
        const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xd9]);

        await tauriPageComposition.registerPdfPageRaster(jpegBytes);
        await tauriPageComposition.selectOutput('front-and-back.jpg', 'JPEG image', 'jpg');

        assert.deepEqual(invokeCalls, [
            { command: 'register_pdf_page_raster', payload: jpegBytes },
            {
                command: 'save_export_dialog',
                payload: {
                    defaultFilename: 'front-and-back.jpg',
                    filterLabel: 'JPEG image',
                    extension: 'jpg',
                },
            },
        ]);
    });

    test('normalizes native file drag events behind the source port', async () => {
        const { tauriDocumentSources } = await import('./tauri-document-sources');
        const events: unknown[] = [];
        const dispose = tauriDocumentSources.listenForFileDrag((event) => events.push(event));
        await Promise.resolve();

        dragDropListener?.({
            payload: { type: 'enter', paths: ['/tmp/front.png'], position: { x: 24, y: 40 } },
        });
        dragDropListener?.({ payload: { type: 'over', position: { x: 30, y: 50 } } });
        dragDropListener?.({
            payload: { type: 'drop', paths: ['/tmp/front.png'], position: { x: 36, y: 60 } },
        });
        dragDropListener?.({ payload: { type: 'leave' } });

        assert.deepEqual(events, [
            { type: 'enter', position: { x: 24, y: 40 } },
            { type: 'over', position: { x: 30, y: 50 } },
            { type: 'drop', paths: ['/tmp/front.png'], position: { x: 36, y: 60 } },
            { type: 'leave' },
        ]);

        await Promise.resolve();
        dispose();
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(dragDropUnlistened, true);
    });

    test('normalizes native file drag events behind the batch port', async () => {
        const { tauriBatchCompression } = await import('./tauri-batch-compression');
        const events: unknown[] = [];
        const dispose = tauriBatchCompression.listenForFileDrag((event) => events.push(event));
        await Promise.resolve();

        dragDropListener?.({ payload: { type: 'enter', paths: ['/tmp/photo.png'] } });
        dragDropListener?.({ payload: { type: 'over', position: { x: 2, y: 3 } } });
        dragDropListener?.({
            payload: { type: 'drop', paths: ['/tmp/photo.png'], position: { x: 4, y: 5 } },
        });
        dragDropListener?.({ payload: { type: 'leave' } });

        assert.deepEqual(events, [
            { type: 'enter' },
            { type: 'over' },
            { type: 'drop', paths: ['/tmp/photo.png'] },
            { type: 'leave' },
        ]);
        dispose();
        await new Promise((resolve) => setTimeout(resolve, 0));
        assert.equal(dragDropUnlistened, true);
    });

    test('forwards scoped batch completion events and disposes the listener', async () => {
        let finishCompression: (result: unknown) => void = () => undefined;
        let markCompressionStarted: () => void = () => undefined;
        const compressionStarted = new Promise<void>((resolve) => {
            markCompressionStarted = resolve;
        });
        invokeHandler = (command) =>
            command === 'compress_batch'
                ? new Promise((resolve) => {
                      finishCompression = resolve;
                      markCompressionStarted();
                  })
                : Promise.resolve(undefined);
        const { tauriBatchCompression } = await import('./tauri-batch-compression');
        const completed: unknown[] = [];
        const request = {
            destinationPath: '/tmp/compressed',
            files: [{ sourceId: 'source-1', sourcePath: '/tmp/example.pdf' }],
            settings: {
                preset: 'balanced' as const,
                imageOutputMode: 'keepSourceFormat' as const,
                jpegQuality: 92 as const,
                jpegBackground: [255, 255, 255] as [number, number, number],
            },
        };
        const compression = tauriBatchCompression.compress(request, (file) => completed.push(file));
        await compressionStarted;
        const file = {
            sourceId: 'source-1',
            sourcePath: '/tmp/example.pdf',
            status: 'compressed' as const,
        };

        eventListeners.get('batch-compression-file-completed')?.({
            payload: { version: 1, file },
        });
        eventListeners.get('batch-compression-file-completed')?.({
            payload: {
                version: 1,
                file: { ...file, sourceId: 'another-run' },
            },
        });
        finishCompression({
            files: [file],
            summary: {
                compressed: 1,
                alreadyOptimized: 0,
                skipped: 0,
                failed: 0,
                originalBytes: 0,
                outputBytes: 0,
            },
        });
        await compression;

        assert.deepEqual(completed, [file]);
        assert.deepEqual(removedEventListeners, ['batch-compression-file-completed']);
    });

    test('surfaces native window errors as rejected promises', async () => {
        nativeWindowError = new TypeError(
            "Cannot read properties of undefined (reading 'metadata')",
        );
        vi.resetModules();
        const { tauriApplicationWindow } = await import('./tauri-window');
        let promise: Promise<void> | undefined;

        assert.doesNotThrow(() => {
            promise = tauriApplicationWindow.setMinSize(1100, 600);
        });
        assert.ok(promise);
        await assert.rejects(promise, /Cannot read properties of undefined \(reading 'metadata'\)/);
    });
});
