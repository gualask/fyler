/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainCss = readFileSync(new URL('./main.css', import.meta.url), 'utf8');
const headerSource = readFileSync(new URL('./app/shell/AppHeader.tsx', import.meta.url), 'utf8');
const toolbarSource = readFileSync(
    new URL('./features/preview/components/toolbar/Toolbar.tsx', import.meta.url),
    'utf8',
);
const moveToSelectSource = readFileSync(
    new URL('./features/preview/components/toolbar/MoveToSelect.tsx', import.meta.url),
    'utf8',
);
const pageQuickActionsSource = readFileSync(
    new URL('./shared/ui/actions/PageQuickActions.tsx', import.meta.url),
    'utf8',
);
const outputPanelCss = readFileSync(
    new URL('./features/export/components/output-panel/output-panel.css', import.meta.url),
    'utf8',
);
const menuStylesSource = readFileSync(
    new URL('./app/shell/settings-menu/menu.styles.ts', import.meta.url),
    'utf8',
);

assert.match(
    mainCss,
    /--ui-overlay-toolbar:/,
    'Overlay toolbar colors should be centralized in tokens.',
);
assert.match(
    mainCss,
    /--ui-overlay-control:/,
    'Overlay control colors should be centralized in tokens.',
);
assert.match(
    mainCss,
    /--ui-swatch-indigo:/,
    'Accent swatches should be expressed through named tokens.',
);

assert.doesNotMatch(
    headerSource,
    /bg-gradient-to-r|from-\[#|to-\[#/,
    'The app header wordmark should no longer use a hard-coded gradient.',
);

assert.match(
    toolbarSource,
    /var\(--ui-overlay-toolbar\)|var\(--ui-overlay-control\)/,
    'Preview toolbar should consume named overlay tokens.',
);

assert.match(
    moveToSelectSource,
    /var\(--ui-overlay-control\)/,
    'Preview move-to select should consume named overlay tokens.',
);

assert.match(
    pageQuickActionsSource,
    /var\(--ui-overlay-control-strong\)|var\(--ui-overlay-control\)/,
    'Page quick actions should consume named overlay tokens.',
);

assert.doesNotMatch(
    outputPanelCss,
    /#22c55e|background:\s*white;|rgba\(255,\s*255,\s*255/,
    'Output-panel fit previews should no longer rely on raw green/white paint values.',
);

assert.match(
    menuStylesSource,
    /var\(--ui-swatch-indigo\)|var\(--ui-swatch-blue\)/,
    'Settings swatches should consume named swatch tokens instead of inline hex values.',
);
