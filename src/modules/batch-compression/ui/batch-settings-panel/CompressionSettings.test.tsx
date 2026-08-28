/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';
import { DEFAULT_BATCH_SETTINGS } from '../../model';
import { CompressionSettings } from './CompressionSettings';

vi.mock('@/shared/i18n', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

test('associates the image format label with its select', () => {
    const markup = renderToStaticMarkup(
        createElement(CompressionSettings, {
            settings: DEFAULT_BATCH_SETTINGS,
            busy: false,
            hasImageSources: true,
            onSettingsChange: () => undefined,
        }),
    );

    const label = markup.match(/<label for="([^"]+)"[^>]*>batch\.settings\.imageFormat<\/label>/);
    assert.ok(label);
    assert.match(markup, new RegExp(`<select id="${label[1]}"`));
});
