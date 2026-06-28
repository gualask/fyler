import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { SourceFile } from '@/shared/domain';
import { createWorkspaceStore, toImageFinalPageId, toPdfFinalPageId } from './workspace.store.js';

const PDF_FILE: SourceFile = {
    id: 'pdf-file',
    originalPath: '/tmp/a.pdf',
    name: 'a.pdf',
    byteSize: 100,
    pageCount: 3,
    kind: 'pdf',
};

const OTHER_PDF_FILE: SourceFile = {
    id: 'other-pdf',
    originalPath: '/tmp/b.pdf',
    name: 'b.pdf',
    byteSize: 100,
    pageCount: 2,
    kind: 'pdf',
};

const IMAGE_FILE: SourceFile = {
    id: 'image-file',
    originalPath: '/tmp/a.jpg',
    name: 'a.jpg',
    byteSize: 50,
    pageCount: 1,
    kind: 'image',
};

test('adds, reorders, and updates source files directly in the store', () => {
    const store = createWorkspaceStore();

    store.getState().addSourceFiles([PDF_FILE, IMAGE_FILE]);
    store.getState().reorderFiles(IMAGE_FILE.id, PDF_FILE.id);
    store.getState().updateFilePageCount(PDF_FILE.id, 5);

    assert.deepEqual(store.getState().source.files, [IMAGE_FILE, { ...PDF_FILE, pageCount: 5 }]);
});

test('stores rotation edits only for compatible source targets', () => {
    const store = createWorkspaceStore();
    store.getState().addSourceFiles([PDF_FILE]);

    const ignored = store.getState().rotateSourcePage(PDF_FILE.id, { kind: 'image' }, 'cw');
    const applied = store
        .getState()
        .rotateSourcePage(PDF_FILE.id, { kind: 'pdf', pageNum: 2 }, 'cw');

    assert.equal(ignored, null);
    assert.equal(applied?.file.id, PDF_FILE.id);
    assert.deepEqual(store.getState().source.editsByFile[PDF_FILE.id], {
        revision: 1,
        pageRotations: { 2: 1 },
        imageRotation: 0,
    });
});

test('stores unique sorted pdf selections and appends pages after existing order', () => {
    const store = createWorkspaceStore();

    store.getState().setImageIncluded(IMAGE_FILE.id, true);
    store.getState().setPdfPagesForFile(PDF_FILE.id, [3, 1, 3, 2]);

    assert.deepEqual(store.getState().composition, {
        selectedPdfPagesByFile: {
            [PDF_FILE.id]: [1, 2, 3],
        },
        includedImagesByFile: {
            [IMAGE_FILE.id]: true,
        },
        pageOrder: [
            toImageFinalPageId(IMAGE_FILE.id),
            toPdfFinalPageId(PDF_FILE.id, 1),
            toPdfFinalPageId(PDF_FILE.id, 2),
            toPdfFinalPageId(PDF_FILE.id, 3),
        ],
    });
});

test('drops deselected pdf pages while preserving relative order of kept pages', () => {
    const store = createWorkspaceStore();

    store.getState().setPdfPagesForFile(PDF_FILE.id, [1, 2, 3]);
    store.getState().setImageIncluded(IMAGE_FILE.id, true);
    store
        .getState()
        .reorderFinalPages(toImageFinalPageId(IMAGE_FILE.id), toPdfFinalPageId(PDF_FILE.id, 2));
    store.getState().setPdfPagesForFile(PDF_FILE.id, [3, 1]);

    assert.deepEqual(store.getState().composition.pageOrder, [
        toPdfFinalPageId(PDF_FILE.id, 1),
        toImageFinalPageId(IMAGE_FILE.id),
        toPdfFinalPageId(PDF_FILE.id, 3),
    ]);
});

test('tracks image inclusion idempotently and removes the image page when excluded', () => {
    const store = createWorkspaceStore();

    store.getState().setImageIncluded(IMAGE_FILE.id, true);
    store.getState().setImageIncluded(IMAGE_FILE.id, true);
    store.getState().setImageIncluded(IMAGE_FILE.id, false);

    assert.deepEqual(store.getState().composition, {
        selectedPdfPagesByFile: {},
        includedImagesByFile: {},
        pageOrder: [],
    });
});

test('applies consecutive page toggles against the current store state', () => {
    const store = createWorkspaceStore();

    store.getState().togglePage(PDF_FILE.id, 1);
    store.getState().togglePage(PDF_FILE.id, 2);
    store.getState().togglePage(PDF_FILE.id, 1);

    assert.deepEqual(store.getState().composition.selectedPdfPagesByFile, {
        [PDF_FILE.id]: [2],
    });
    assert.deepEqual(store.getState().composition.pageOrder, [toPdfFinalPageId(PDF_FILE.id, 2)]);
});

test('removes a final page using the latest page selection', () => {
    const store = createWorkspaceStore();

    store.getState().setPdfPagesForFile(PDF_FILE.id, [1, 2, 3]);
    store.getState().removeFinalPage(toPdfFinalPageId(PDF_FILE.id, 2));

    assert.deepEqual(store.getState().composition.selectedPdfPagesByFile, {
        [PDF_FILE.id]: [1, 3],
    });
    assert.deepEqual(store.getState().composition.pageOrder, [
        toPdfFinalPageId(PDF_FILE.id, 1),
        toPdfFinalPageId(PDF_FILE.id, 3),
    ]);
});

test('removes all composition state for a file across pdf and image entries', () => {
    const store = createWorkspaceStore();

    store.getState().setPdfPagesForFile(PDF_FILE.id, [1, 2]);
    store.getState().setImageIncluded(IMAGE_FILE.id, true);
    store.getState().removePagesForFile(PDF_FILE.id);

    assert.deepEqual(store.getState().composition, {
        selectedPdfPagesByFile: {},
        includedImagesByFile: {
            [IMAGE_FILE.id]: true,
        },
        pageOrder: [toImageFinalPageId(IMAGE_FILE.id)],
    });
});

test('removes source files in one store action and reports removed plus remaining ids', () => {
    const store = createWorkspaceStore();
    store.getState().addSourceFiles([PDF_FILE, OTHER_PDF_FILE]);
    store.getState().rotateSourcePage(PDF_FILE.id, { kind: 'pdf', pageNum: 1 }, 'cw');

    const result = store.getState().removeSourceFiles([PDF_FILE.id]);

    assert.deepEqual(result, {
        removedFiles: [PDF_FILE],
        remainingIds: [OTHER_PDF_FILE.id],
    });
    assert.deepEqual(store.getState().source.files, [OTHER_PDF_FILE]);
    assert.deepEqual(store.getState().source.editsByFile, {});
});

test('selects and focuses files with monotonic UI signal keys', () => {
    const store = createWorkspaceStore();

    store.getState().selectFile(PDF_FILE.id);
    store.getState().focusSource(IMAGE_FILE.id, { kind: 'image' }, 'final');

    assert.deepEqual(store.getState().ui, {
        selectedId: IMAGE_FILE.id,
        selectedFileScrollKey: 2,
        focusedSource: {
            fileId: IMAGE_FILE.id,
            target: { kind: 'image' },
            flashKey: 2,
            flashTarget: 'final',
        },
        uiSignalKey: 2,
    });
});

test('applies file-added and file-removed UI selection rules in store actions', () => {
    const store = createWorkspaceStore();

    store.getState().applyFilesAddedUi([{ id: IMAGE_FILE.id, kind: 'image' }]);
    store.getState().applyFileRemovedUi(IMAGE_FILE.id, [PDF_FILE.id]);

    assert.deepEqual(store.getState().ui, {
        selectedId: PDF_FILE.id,
        selectedFileScrollKey: 2,
        focusedSource: null,
        uiSignalKey: 2,
    });
});
