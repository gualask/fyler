/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const appSource = readFileSync(new URL('./AppSettingsMenu.tsx', import.meta.url), 'utf8');
const languageSource = readFileSync(new URL('./LanguageSubmenu.tsx', import.meta.url), 'utf8');
const themeSource = readFileSync(new URL('./ThemeSubmenu.tsx', import.meta.url), 'utf8');
const combinedSource = [appSource, languageSource, themeSource].join('\n');

assert.doesNotMatch(
    combinedSource,
    /role="menu(?:item|itemradio)?"/,
    'Settings popovers should not expose fake menu semantics without the full keyboard model.',
);

assert.doesNotMatch(
    appSource,
    /aria-haspopup="menu"/,
    'The settings trigger should no longer announce a menu popup.',
);

for (const [name, source] of [
    ['AppSettingsMenu', appSource],
    ['LanguageSubmenu', languageSource],
    ['ThemeSubmenu', themeSource],
] as const) {
    assert.match(
        source,
        /aria-controls=/,
        `${name} should expose explicit disclosure relationships for keyboard users.`,
    );
}
