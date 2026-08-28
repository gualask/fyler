/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';
import { UpdateDialogView } from './UpdateDialog';

vi.mock('@/shared/i18n', () => ({
    useTranslation: () => ({
        t: (key: string, values?: Record<string, string>) =>
            values ? `${key}:${JSON.stringify(values)}` : key,
    }),
}));

test('uses accessible error contrast and transform-based progress', () => {
    const markup = renderToStaticMarkup(
        createElement(UpdateDialogView, {
            updateVersion: '1.2.3',
            installing: true,
            progress: 25,
            error: 'Network unavailable',
            onInstall: () => undefined,
            onDismiss: () => undefined,
        }),
    );

    assert.match(markup, /text-ui-danger-soft-text/);
    assert.match(markup, /role="alert"/);
    assert.match(markup, /role="progressbar"/);
    assert.match(markup, /aria-valuenow="25"/);
    assert.match(markup, /role="status"/);
    assert.match(markup, /dialog-panel[^"<]*outline-none/);
    assert.match(markup, /transform:scaleX\(0\.25\)/);
    assert.doesNotMatch(markup, /transition-\[width\]/);
});

test('clamps out-of-range progress for visual and accessible values', () => {
    const markup = renderToStaticMarkup(
        createElement(UpdateDialogView, {
            updateVersion: '1.2.3',
            installing: true,
            progress: 125,
            error: null,
            onInstall: () => undefined,
            onDismiss: () => undefined,
        }),
    );

    assert.match(markup, /aria-valuenow="100"/);
    assert.match(markup, /transform:scaleX\(1\)/);
});
