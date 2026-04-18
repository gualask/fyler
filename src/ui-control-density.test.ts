/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mainCss = readFileSync(new URL('./main.css', import.meta.url), 'utf8');
const zoomControls = readFileSync(
    new URL('./features/preview/components/toolbar/ZoomControls.tsx', import.meta.url),
    'utf8',
);
const rotateControls = readFileSync(
    new URL('./features/preview/components/toolbar/RotateControls.tsx', import.meta.url),
    'utf8',
);
const moveToSelect = readFileSync(
    new URL('./features/preview/components/toolbar/MoveToSelect.tsx', import.meta.url),
    'utf8',
);
const quickAddView = readFileSync(
    new URL('./features/workspace/components/QuickAddView.tsx', import.meta.url),
    'utf8',
);
const pdfThumbnailItem = readFileSync(
    new URL('./features/page-picker/components/panels/PdfThumbnailItem.tsx', import.meta.url),
    'utf8',
);
const tutorialCard = readFileSync(
    new URL('./features/tutorial/components/TutorialCard.tsx', import.meta.url),
    'utf8',
);

assert.match(
    mainCss,
    /\.btn-primary\s*\{[\s\S]*min-h-10/,
    'Primary buttons should expose a 40px minimum hit area.',
);

assert.match(
    mainCss,
    /\.btn-ghost\s*\{[\s\S]*min-h-10/,
    'Ghost buttons should expose a 40px minimum hit area.',
);

assert.match(
    mainCss,
    /\.btn-icon\s*\{[\s\S]*h-10 w-10/,
    'Icon buttons should expose a 40px hit area.',
);

assert.match(
    mainCss,
    /\.btn-ghost-sm\s*\{[\s\S]*min-h-9/,
    'Compact ghost buttons should stay at or above a 36px hit area.',
);

assert.match(
    zoomControls,
    /className="flex h-9 w-9 items-center justify-center/,
    'Preview zoom buttons should use larger 36px hit areas.',
);

assert.match(
    zoomControls,
    /className="min-h-9 rounded-md px-3/,
    'Preview reset control should expose a larger hit area.',
);

assert.match(
    rotateControls,
    /className="flex h-9 w-9 items-center justify-center/,
    'Preview rotate buttons should use larger 36px hit areas.',
);

assert.match(
    moveToSelect,
    /className="h-10 appearance-none rounded-lg/,
    'Preview move-to select should expose a 40px hit area.',
);

assert.match(
    quickAddView,
    /className="flex h-9 w-9 shrink-0 items-center justify-center/,
    'Quick Add remove actions should expose larger touch targets.',
);

assert.match(
    pdfThumbnailItem,
    /className=\{\[\s*'absolute right-2 top-2 z-30 flex h-9 w-9 items-center justify-center/,
    'Page-picker selection toggles should expose larger hit areas.',
);

assert.match(
    tutorialCard,
    /className="btn-ghost-sm"/,
    'Tutorial skip should use the compact shared button treatment instead of a plain text link-sized target.',
);

assert.match(
    tutorialCard,
    /className="btn-primary"/,
    'Tutorial next should use the shared primary button baseline.',
);
