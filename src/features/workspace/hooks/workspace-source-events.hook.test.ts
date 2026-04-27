import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SourceFile } from '@/shared/domain';
import {
    applyResolvedPageCount,
    createWorkspaceFilesAddedEvent,
    handleSourcePageCount,
} from './workspace-source-events.hook.js';

const PDF_FILE: SourceFile = {
    id: 'pdf-file',
    originalPath: '/tmp/source.pdf',
    name: 'source.pdf',
    byteSize: 100,
    pageCount: null,
    kind: 'pdf',
};

function createPageCountRecorder() {
    const updates: Array<{ id: string; count: number }> = [];
    const selections: Array<{ fileId: string; pages: number[] }> = [];

    return {
        updates,
        selections,
        updateFilePageCount: (id: string, count: number) => updates.push({ id, count }),
        setPdfPagesForFile: (fileId: string, pages: number[]) => selections.push({ fileId, pages }),
    };
}

test('applies page count and selects all pages when the source is active', () => {
    const pendingPageCounts = new Map<string, number>();
    const recorder = createPageCountRecorder();

    const result = handleSourcePageCount({
        fileId: PDF_FILE.id,
        pageCount: 3,
        files: [PDF_FILE],
        pendingPageCounts,
        updateFilePageCount: recorder.updateFilePageCount,
        setPdfPagesForFile: recorder.setPdfPagesForFile,
    });

    assert.equal(result, 'applied');
    assert.deepEqual(recorder.updates, [{ id: PDF_FILE.id, count: 3 }]);
    assert.deepEqual(recorder.selections, [{ fileId: PDF_FILE.id, pages: [1, 2, 3] }]);
    assert.equal(pendingPageCounts.size, 0);
});

test('buffers early page counts without mutating composition before the source is active', () => {
    const pendingPageCounts = new Map<string, number>();
    const recorder = createPageCountRecorder();

    const result = handleSourcePageCount({
        fileId: PDF_FILE.id,
        pageCount: 4,
        files: [],
        pendingPageCounts,
        updateFilePageCount: recorder.updateFilePageCount,
        setPdfPagesForFile: recorder.setPdfPagesForFile,
    });

    assert.equal(result, 'pending');
    assert.deepEqual(recorder.updates, []);
    assert.deepEqual(recorder.selections, []);
    assert.equal(pendingPageCounts.get(PDF_FILE.id), 4);
});

test('applies a buffered page count when the source is later committed', () => {
    const pendingPageCounts = new Map<string, number>();
    const recorder = createPageCountRecorder();

    handleSourcePageCount({
        fileId: PDF_FILE.id,
        pageCount: 2,
        files: [],
        pendingPageCounts,
        updateFilePageCount: recorder.updateFilePageCount,
        setPdfPagesForFile: recorder.setPdfPagesForFile,
    });

    const pendingCount = pendingPageCounts.get(PDF_FILE.id);
    assert.equal(pendingCount, 2);
    assert.ok(pendingCount !== undefined);
    pendingPageCounts.delete(PDF_FILE.id);
    applyResolvedPageCount({
        fileId: PDF_FILE.id,
        pageCount: pendingCount,
        updateFilePageCount: recorder.updateFilePageCount,
        setPdfPagesForFile: recorder.setPdfPagesForFile,
    });

    assert.equal(pendingPageCounts.size, 0);
    assert.deepEqual(recorder.updates, [{ id: PDF_FILE.id, count: 2 }]);
    assert.deepEqual(recorder.selections, [{ fileId: PDF_FILE.id, pages: [1, 2] }]);
});

test('builds a first-workspace-entry event when real files are added to an empty workspace', () => {
    assert.deepEqual(
        createWorkspaceFilesAddedEvent({
            currentFiles: [],
            addedFiles: [PDF_FILE],
        }),
        {
            ids: [PDF_FILE.id],
            wasWorkspaceEmpty: true,
        },
    );
});

test('marks later file additions as not coming from the empty state', () => {
    assert.deepEqual(
        createWorkspaceFilesAddedEvent({
            currentFiles: [PDF_FILE],
            addedFiles: [{ ...PDF_FILE, id: 'second-pdf' }],
        }),
        {
            ids: ['second-pdf'],
            wasWorkspaceEmpty: false,
        },
    );
});

test('does not create a file-added event when no files were actually added', () => {
    assert.equal(
        createWorkspaceFilesAddedEvent({
            currentFiles: [PDF_FILE],
            addedFiles: [],
        }),
        null,
    );
});
