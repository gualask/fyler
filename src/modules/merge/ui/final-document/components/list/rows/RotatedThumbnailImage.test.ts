/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import { RotatedThumbnailImage } from './RotatedThumbnailImage';

test('renders the first paint already rotated with no transition', () => {
    const markup = renderToStaticMarkup(
        createElement(RotatedThumbnailImage, {
            src: '/fixtures/sample-image.jpg',
            alt: '',
            imageRotation: 90,
        }),
    );

    assert.match(markup, /transform:rotate\(90deg\)/);
    assert.match(markup, /transition:none/);
});
