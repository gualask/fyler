/// <reference types="node" />

import assert from 'node:assert/strict';

import { resolvePreferencesState } from './preferences.bootstrap.js';

assert.deepEqual(resolvePreferencesState(undefined, ['it-IT']), {
    isDark: false,
    locale: 'it',
    accent: 'indigo',
    tutorialSeen: false,
});

assert.deepEqual(
    resolvePreferencesState(
        {
            isDark: true,
            locale: 'fr' as never,
            accent: 'pink' as never,
            tutorialSeen: true,
        },
        ['en-GB'],
    ),
    {
        isDark: true,
        locale: 'en',
        accent: 'indigo',
        tutorialSeen: true,
    },
);
