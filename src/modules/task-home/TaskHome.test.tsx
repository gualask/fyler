/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';
import { TaskHome } from './TaskHome';

vi.mock('@/shared/i18n', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

test('renders three accessible workflow buttons with decorative result previews', () => {
    const markup = renderToStaticMarkup(
        createElement(TaskHome, {
            onOpenMerge: () => undefined,
            onOpenPageComposition: () => undefined,
            onOpenBatchCompression: () => undefined,
            renderSettingsMenu: () => createElement('span', null, 'Settings'),
        }),
    );

    assert.equal(markup.match(/<button/g)?.length, 3);
    assert.match(markup, /taskHome\.merge\.title/);
    assert.match(markup, /taskHome\.composition\.title/);
    assert.match(markup, /taskHome\.compression\.title/);
    assert.match(markup, /<span aria-hidden="true" data-task-preview="merge"/);
    assert.match(markup, /<span aria-hidden="true" data-task-preview="composition"/);
    assert.match(markup, /<span aria-hidden="true" data-task-preview="compression"/);
});
