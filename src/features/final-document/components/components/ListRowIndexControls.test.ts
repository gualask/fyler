/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const controlsSource = readFileSync(new URL('./ListRowIndexControls.tsx', import.meta.url), 'utf8');
const shellSource = readFileSync(new URL('./FinalDocumentRowShell.tsx', import.meta.url), 'utf8');

assert.match(
    controlsSource,
    /'flex h-10 w-10 items-center justify-center rounded-md/,
    'Large final-document index controls should expose 40px hit areas.',
);

assert.match(
    controlsSource,
    /'flex h-9 w-9 items-center justify-center rounded-md/,
    'Compact final-document index controls should expose 36px hit areas.',
);

assert.match(
    controlsSource,
    /aria-label=\{t\('finalDocument.movePageUp'\)\}/,
    'Move-up controls need an explicit accessible name.',
);

assert.match(
    controlsSource,
    /aria-label=\{t\('finalDocument.movePageDown'\)\}/,
    'Move-down controls need an explicit accessible name.',
);

assert.match(
    controlsSource,
    /aria-label=\{t\('finalDocument.moveToIndex'\)\}/,
    'Editable position controls need an explicit accessible name.',
);

assert.match(
    shellSource,
    /aria-label=\{t\('finalDocument.removePage'\)\}/,
    'Final-document remove controls should expose an explicit accessible name.',
);

assert.match(
    shellSource,
    /group-focus-within:flex/,
    'Final-document remove controls should become reachable on keyboard focus, not only hover.',
);
