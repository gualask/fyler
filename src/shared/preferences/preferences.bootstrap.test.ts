/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'vitest';

import { mergeHydratedPreferences, resolvePreferencesState } from './preferences.bootstrap.js';

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

test('uses loaded preferences when no fields changed before hydration', () => {
    const current = resolvePreferencesState(undefined, ['en-US']);
    const loaded = resolvePreferencesState(
        {
            isDark: true,
            locale: 'it',
            accent: 'teal',
            tutorialSeen: true,
            finalDocumentLayout: 'columns-1',
        },
        ['en-US'],
    );

    assert.deepEqual(
        mergeHydratedPreferences({
            current,
            loaded,
            dirtyFields: new Set(),
        }),
        loaded,
    );
});

test('preserves fields changed before hydration and adopts the other loaded fields', () => {
    const current = resolvePreferencesState(
        {
            isDark: true,
            locale: 'en',
            accent: 'blue',
            tutorialSeen: false,
            finalDocumentLayout: 'columns-2',
        },
        ['en-US'],
    );
    const loaded = resolvePreferencesState(
        {
            isDark: false,
            locale: 'it',
            accent: 'teal',
            tutorialSeen: true,
            finalDocumentLayout: 'columns-1',
        },
        ['en-US'],
    );

    assert.deepEqual(
        mergeHydratedPreferences({
            current,
            loaded,
            dirtyFields: new Set(['isDark', 'accent']),
        }),
        {
            isDark: true,
            locale: 'it',
            accent: 'blue',
            tutorialSeen: true,
            finalDocumentLayout: 'columns-1',
        },
    );
});

test('preserves all current preferences when every field changed before hydration', () => {
    const current = resolvePreferencesState(
        {
            isDark: true,
            locale: 'en',
            accent: 'blue',
            tutorialSeen: true,
            finalDocumentLayout: 'columns-1',
        },
        ['en-US'],
    );
    const loaded = resolvePreferencesState(
        {
            isDark: false,
            locale: 'it',
            accent: 'teal',
            tutorialSeen: false,
            finalDocumentLayout: 'columns-2',
        },
        ['en-US'],
    );

    assert.deepEqual(
        mergeHydratedPreferences({
            current,
            loaded,
            dirtyFields: new Set([
                'isDark',
                'locale',
                'accent',
                'tutorialSeen',
                'finalDocumentLayout',
            ]),
        }),
        current,
    );
});
