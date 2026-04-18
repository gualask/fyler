/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const tutorialOverlaySource = readFileSync(
    new URL('./features/tutorial/components/TutorialOverlay.tsx', import.meta.url),
    'utf8',
);
const progressModalSource = readFileSync(
    new URL('./app/overlays/ProgressModal.tsx', import.meta.url),
    'utf8',
);
const updateDialogSource = readFileSync(
    new URL('./app/updates/UpdateDialog.tsx', import.meta.url),
    'utf8',
);

assert.match(
    tutorialOverlaySource,
    /--tutorial-spotlight-top|--tutorial-spotlight-left|--tutorial-spotlight-width|--tutorial-spotlight-height/,
    'Tutorial spotlight should drive its geometry through dedicated CSS variables.',
);

assert.match(
    tutorialOverlaySource,
    /top:\s*'var\(--tutorial-spotlight-top\)'|left:\s*'var\(--tutorial-spotlight-left\)'|width:\s*'var\(--tutorial-spotlight-width\)'|height:\s*'var\(--tutorial-spotlight-height\)'/,
    'Tutorial spotlight should render from CSS variables so the cutout keeps a stable rectangular shape.',
);

assert.doesNotMatch(
    tutorialOverlaySource,
    /scaleX:\s*rect\.width|scaleY:\s*rect\.height/,
    'Tutorial spotlight should not scale the cutout shape directly, because that distorts the highlight into an ellipse.',
);

assert.doesNotMatch(
    tutorialOverlaySource,
    /top:\s*rect\.top|left:\s*rect\.left|width:\s*rect\.width|height:\s*rect\.height/,
    'Tutorial spotlight should not bind layout geometry directly to rect values without the dedicated spotlight variables.',
);

assert.doesNotMatch(
    progressModalSource,
    /transition-all/,
    'Progress modal bars should not use transition-all.',
);

assert.match(
    progressModalSource,
    /transition-\[width\]/,
    'Progress modal bars should restrict animation to width changes.',
);

assert.doesNotMatch(
    updateDialogSource,
    /transition-all/,
    'Update dialog bars should not use transition-all.',
);

assert.match(
    updateDialogSource,
    /transition-\[width\]/,
    'Update dialog bars should restrict animation to width changes.',
);
