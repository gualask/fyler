/// <reference types="node" />

import assert from 'node:assert/strict';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import { ProgressiveDisclosure } from './ProgressiveDisclosure';

test('starts collapsed and exposes its controlled region', () => {
    const markup = renderToStaticMarkup(
        <ProgressiveDisclosure collapsedLabel="Show options" expandedLabel="Hide options">
            <span>Advanced content</span>
        </ProgressiveDisclosure>,
    );

    assert.match(markup, /aria-expanded="false"/);
    assert.match(markup, /aria-controls="[^"]+"/);
    assert.match(markup, /Show options/);
    assert.doesNotMatch(markup, /Advanced content/);
});
