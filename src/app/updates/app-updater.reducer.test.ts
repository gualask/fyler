import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { AvailableUpdate } from '@/infra/platform/updater';
import { appUpdaterReducer, initialAppUpdaterState } from './app-updater.reducer.js';

const UPDATE = {
    version: '1.2.3',
    downloadAndInstall: async () => undefined,
} as AvailableUpdate;

test('stores a discovered update', () => {
    const state = appUpdaterReducer(initialAppUpdaterState, {
        type: 'update-found',
        update: UPDATE,
    });

    assert.deepEqual(state, {
        ...initialAppUpdaterState,
        update: UPDATE,
        available: true,
        version: '1.2.3',
    });
});

test('tracks install progress', () => {
    const started = appUpdaterReducer(
        {
            ...initialAppUpdaterState,
            update: UPDATE,
            available: true,
        },
        { type: 'install-started' },
    );
    const progressed = appUpdaterReducer(started, {
        type: 'install-progress',
        progress: 67,
    });

    assert.deepEqual(progressed, {
        ...started,
        progress: 67,
    });
});

test('stores install failure and stops progress', () => {
    const state = appUpdaterReducer(
        {
            ...initialAppUpdaterState,
            update: UPDATE,
            installing: true,
            progress: 22,
        },
        { type: 'install-failed', error: 'nope' },
    );

    assert.deepEqual(state, {
        ...initialAppUpdaterState,
        update: UPDATE,
        installing: false,
        progress: null,
        error: 'nope',
    });
});

test('dismisses the update dialog', () => {
    const state = appUpdaterReducer(
        {
            ...initialAppUpdaterState,
            update: UPDATE,
            available: true,
            version: UPDATE.version,
            error: 'old error',
        },
        { type: 'dismissed' },
    );

    assert.equal(state.dismissed, true);
    assert.equal(state.error, null);
});
