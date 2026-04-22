/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { resolvePreferencesState } from './preferences.bootstrap.js';

test('resolves preferences state with safe fallbacks', () => {
    assert.deepEqual(resolvePreferencesState(undefined, ['it-IT']), {
        isDark: false,
        locale: 'it',
        accent: 'indigo',
        tutorialSeen: false,
        finalDocumentLayout: 'columns-2',
    });

    assert.deepEqual(
        resolvePreferencesState(
            {
                isDark: true,
                locale: 'fr' as never,
                accent: 'pink' as never,
                tutorialSeen: true,
                finalDocumentLayout: 'gallery' as never,
            },
            ['en-GB'],
        ),
        {
            isDark: true,
            locale: 'en',
            accent: 'indigo',
            tutorialSeen: true,
            finalDocumentLayout: 'columns-2',
        },
    );
});
