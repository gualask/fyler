/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement, Fragment } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import { renderSlotContent } from './PageSlot.render';

test('falls back to the A4 image preview when export-matched rendering is unavailable', () => {
    const markup = renderToStaticMarkup(
        createElement(
            Fragment,
            null,
            renderSlotContent({
                isImage: true,
                imageSrc: '/fixtures/sample-image.jpg',
                imageRotation: 90,
                matchExportedImages: true,
                exportMatchedImageSrc: null,
                isExportMatchedImagePending: false,
                useA4Container: true,
                rotatedImagePreviewStatus: 'idle',
                imageFitMode: 'contain',
            }),
        ),
    );

    assert.match(markup, /<img/);
    assert.match(markup, /transform:rotate\(90deg\)/);
    assert.doesNotMatch(markup, /animate-spin/);
});
