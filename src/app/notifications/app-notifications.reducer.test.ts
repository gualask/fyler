import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    appNotificationsReducer,
    initialAppNotificationsState,
} from './app-notifications.reducer.js';

test('stores merge progress in loading state', () => {
    const state = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-merge-progress',
        step: 'merging-pages',
        progress: 42,
    });

    assert.deepEqual(state, {
        status: null,
        loading: {
            kind: 'merge-progress',
            step: 'merging-pages',
            progress: 42,
        },
    });
});

test('shows an error status message', () => {
    const state = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-error',
        message: 'Boom',
    });

    assert.deepEqual(state, {
        status: { kind: 'error', message: 'Boom' },
        loading: null,
    });
});

test('clears status without touching loading', () => {
    const state = appNotificationsReducer(
        {
            status: { kind: 'toast', tone: 'success', message: 'Done' },
            loading: { kind: 'opening-files' },
        },
        { type: 'clear-status' },
    );

    assert.deepEqual(state, {
        status: null,
        loading: { kind: 'opening-files' },
    });
});

test('clears loading without touching status', () => {
    const state = appNotificationsReducer(
        {
            status: { kind: 'export-completed' },
            loading: { kind: 'merge-progress', step: 'merging-pages', progress: 88 },
        },
        { type: 'clear-loading' },
    );

    assert.deepEqual(state, {
        status: { kind: 'export-completed' },
        loading: null,
    });
});
