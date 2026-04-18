/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const previewSource = readFileSync(
    new URL('../../features/preview/components/PreviewModal.tsx', import.meta.url),
    'utf8',
);
const supportSource = readFileSync(
    new URL('../../features/support/components/SupportDialog.tsx', import.meta.url),
    'utf8',
);
const updateSource = readFileSync(new URL('../updates/UpdateDialog.tsx', import.meta.url), 'utf8');
const progressSource = readFileSync(new URL('./ProgressModal.tsx', import.meta.url), 'utf8');

for (const [name, source] of [
    ['PreviewModal', previewSource],
    ['SupportDialog', supportSource],
    ['UpdateDialog', updateSource],
    ['ProgressModal', progressSource],
] as const) {
    assert.match(
        source,
        /role="(?:dialog|alertdialog)"/,
        `${name} should expose dialog semantics to assistive technology.`,
    );
    assert.match(source, /aria-modal="true"/, `${name} should mark the overlay as modal.`);
    assert.match(
        source,
        /aria-(?:label|labelledby)=/,
        `${name} should provide an accessible dialog label.`,
    );
    assert.match(source, /useModalFocus/, `${name} should wire the shared modal focus handling.`);
}
