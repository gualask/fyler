/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('./AppSettingsMenu.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(
    appSource,
    /role="menu(?:item|itemradio)?"/,
    'Settings controls should not expose fake menu semantics without the full keyboard model.',
);

assert.doesNotMatch(
    appSource,
    /aria-haspopup="menu"/,
    'The settings trigger should no longer announce a menu popup.',
);

assert.match(
    appSource,
    /aria-controls=/,
    'AppSettingsMenu should expose an explicit disclosure relationship for keyboard users.',
);
