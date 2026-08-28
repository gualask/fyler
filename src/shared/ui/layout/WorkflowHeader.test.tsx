/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { test, vi } from 'vitest';
import { WorkflowHeader } from './WorkflowHeader';

vi.mock('@/shared/i18n', () => ({
    useTranslation: () => ({ t: (key: string) => key }),
}));

test('renders the shared workflow navigation and action slots', () => {
    const markup = renderToStaticMarkup(
        createElement(WorkflowHeader, {
            title: 'Workflow title',
            backDisabled: true,
            onBack: () => undefined,
            utilityActions: createElement('span', null, 'Utility'),
            settingsControl: createElement('span', null, 'Settings'),
            primaryActions: createElement('span', null, 'Primary'),
        }),
    );

    assert.match(markup, /<header/);
    assert.match(markup, /<h1[^>]*>Workflow title<\/h1>/);
    assert.match(markup, /<h1[^>]*class="[^"]*sr-only[^"]*md:not-sr-only/);
    assert.match(markup, /aria-label="navigation\.backToTaskSelection"/);
    assert.match(markup, /disabled=""/);
    assert.match(markup, /Workflow title/);
    assert.match(markup, /Utility/);
    assert.match(markup, /Settings/);
    assert.match(markup, /Primary/);
});
