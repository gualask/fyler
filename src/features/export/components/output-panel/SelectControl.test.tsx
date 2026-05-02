/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';
import { SelectControl } from './SelectControl';

vi.mock('@/shared/i18n', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

test('associates the visible label with the select control', () => {
    const markup = renderToStaticMarkup(
        createElement(SelectControl, {
            label: 'Page fit',
            options: [
                { value: 'contain', label: 'Contain' },
                { value: 'cover', label: 'Cover' },
            ],
            value: 'contain',
            onChange: () => undefined,
        }),
    );

    const label = markup.match(/<label id="([^"]+)" for="([^"]+)">Page fit<\/label>/);
    const select = markup.match(/<select id="([^"]+)" aria-labelledby="([^"]+)"/);

    assert.ok(label);
    assert.ok(select);
    assert.equal(select[1], label[2]);
    assert.equal(select[2], label[1]);
});
