import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    compositionReducer,
    initialCompositionState,
    toImageFinalPageId,
    toPdfFinalPageId,
} from './composition.reducer.js';

test('stores unique sorted pdf selections and appends new pages after existing order', () => {
    const state = compositionReducer(
        {
            ...initialCompositionState,
            pageOrder: [toImageFinalPageId('image-file')],
        },
        {
            type: 'set-pdf-selection',
            fileId: 'pdf-file',
            pages: [3, 1, 3, 2],
        },
    );

    assert.deepEqual(state, {
        selectedPdfPagesByFile: {
            'pdf-file': [1, 2, 3],
        },
        includedImagesByFile: {},
        pageOrder: [
            toImageFinalPageId('image-file'),
            toPdfFinalPageId('pdf-file', 1),
            toPdfFinalPageId('pdf-file', 2),
            toPdfFinalPageId('pdf-file', 3),
        ],
    });
});

test('drops deselected pdf pages while preserving the relative order of kept pages', () => {
    const state = compositionReducer(
        {
            selectedPdfPagesByFile: {
                'pdf-file': [1, 2, 3],
            },
            includedImagesByFile: {
                'image-file': true,
            },
            pageOrder: [
                toPdfFinalPageId('pdf-file', 1),
                toImageFinalPageId('image-file'),
                toPdfFinalPageId('pdf-file', 2),
                toPdfFinalPageId('pdf-file', 3),
            ],
        },
        {
            type: 'set-pdf-selection',
            fileId: 'pdf-file',
            pages: [3, 1],
        },
    );

    assert.deepEqual(state, {
        selectedPdfPagesByFile: {
            'pdf-file': [1, 3],
        },
        includedImagesByFile: {
            'image-file': true,
        },
        pageOrder: [
            toPdfFinalPageId('pdf-file', 1),
            toImageFinalPageId('image-file'),
            toPdfFinalPageId('pdf-file', 3),
        ],
    });
});

test('tracks image inclusion idempotently and removes the image page when excluded', () => {
    const includedState = compositionReducer(initialCompositionState, {
        type: 'set-image-included',
        fileId: 'image-file',
        included: true,
    });
    const includedAgainState = compositionReducer(includedState, {
        type: 'set-image-included',
        fileId: 'image-file',
        included: true,
    });
    const excludedState = compositionReducer(includedAgainState, {
        type: 'set-image-included',
        fileId: 'image-file',
        included: false,
    });

    assert.deepEqual(includedState, {
        selectedPdfPagesByFile: {},
        includedImagesByFile: {
            'image-file': true,
        },
        pageOrder: [toImageFinalPageId('image-file')],
    });
    assert.deepEqual(includedAgainState, includedState);
    assert.deepEqual(excludedState, initialCompositionState);
});

test('removes all composition state for a file across pdf and image entries', () => {
    const state = compositionReducer(
        {
            selectedPdfPagesByFile: {
                'pdf-file': [1, 2],
            },
            includedImagesByFile: {
                'image-file': true,
            },
            pageOrder: [
                toPdfFinalPageId('pdf-file', 1),
                toImageFinalPageId('image-file'),
                toPdfFinalPageId('pdf-file', 2),
            ],
        },
        { type: 'remove-file', fileId: 'pdf-file' },
    );

    assert.deepEqual(state, {
        selectedPdfPagesByFile: {},
        includedImagesByFile: {
            'image-file': true,
        },
        pageOrder: [toImageFinalPageId('image-file')],
    });
});
