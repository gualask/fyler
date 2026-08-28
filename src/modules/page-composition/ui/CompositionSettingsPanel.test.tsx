/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';
import { CompositionSettingsPanel } from './CompositionSettingsPanel';

vi.mock('@/shared/i18n', () => ({
    useTranslation: () => ({
        t: (key: string) => key,
    }),
}));

function findToggle(markup: string, value: string) {
    const button = markup.match(new RegExp(`<button[^>]*data-toggle-value="${value}"[^>]*>`));
    assert.ok(button);
    return button[0];
}

test('labels settings and exposes the selected layout and preset', () => {
    const markup = renderToStaticMarkup(
        createElement(CompositionSettingsPanel, {
            layout: 'a4-side-by-side-halves',
            outputFormat: 'jpeg',
            preset: 'light',
            jpegQuality: 92,
            busy: false,
            onLayoutChange: () => undefined,
            onOutputFormatChange: () => undefined,
            onPresetChange: () => undefined,
            onJpegQualityChange: () => undefined,
        }),
    );

    assert.match(markup, /pageComposition\.settings\.title/);
    assert.match(markup, /pageComposition\.settings\.layout/);
    assert.match(findToggle(markup, 'jpeg'), /aria-pressed="true"/);
    assert.match(markup, /compression\.presetLabel/);
    assert.match(findToggle(markup, 'a4-stacked-halves'), /aria-pressed="false"/);
    assert.match(findToggle(markup, 'a4-side-by-side-halves'), /aria-pressed="true"/);
    assert.match(findToggle(markup, 'light'), /aria-pressed="true"/);
});
