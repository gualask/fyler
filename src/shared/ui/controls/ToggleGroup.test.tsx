/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test } from 'vitest';
import { ToggleGroup } from './ToggleGroup';

function findButton(markup: string, value: string) {
    const button = markup.match(new RegExp(`<button[^>]*data-toggle-value="${value}"[^>]*>`));
    assert.ok(button);
    return button[0];
}

test('exposes selected state on each toggle button', () => {
    const markup = renderToStaticMarkup(
        createElement(ToggleGroup, {
            options: [
                { value: 'list', label: 'List' },
                { value: 'grid', label: 'Grid' },
            ],
            value: 'grid',
            onChange: () => undefined,
        }),
    );

    assert.match(findButton(markup, 'list'), /aria-pressed="false"/);
    assert.match(findButton(markup, 'grid'), /aria-pressed="true"/);
});
