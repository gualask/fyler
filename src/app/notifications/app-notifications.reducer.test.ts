import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    appNotificationsReducer,
    initialAppNotificationsState,
} from './app-notifications.reducer.js';

test('stores merge progress in loading state', () => {
    const preparing = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-merge-preparing',
    });
    const state = appNotificationsReducer(preparing, {
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

test('stores monotonic file progress while an import is active', () => {
    const opening = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-opening-files',
    });
    const progressed = appNotificationsReducer(opening, {
        type: 'show-import-progress',
        completed: 4,
        total: 7,
    });
    const outOfOrder = appNotificationsReducer(progressed, {
        type: 'show-import-progress',
        completed: 3,
        total: 7,
    });

    assert.deepEqual(outOfOrder.loading, {
        kind: 'opening-files',
        completed: 4,
        total: 7,
    });
});

test('ignores stale file progress after the import loader closes', () => {
    const state = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-import-progress',
        completed: 7,
        total: 7,
    });

    assert.equal(state, initialAppNotificationsState);
});

test('finishes only the file import loader', () => {
    const mergeState = {
        status: null,
        loading: {
            kind: 'merge-progress' as const,
            step: 'saving' as const,
            progress: 90,
        },
    };

    assert.equal(appNotificationsReducer(mergeState, { type: 'finish-opening-files' }), mergeState);
});

test('does not replace an active import with merge progress', () => {
    const opening = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-opening-files',
    });
    const preparing = appNotificationsReducer(opening, {
        type: 'show-merge-preparing',
    });
    const progressed = appNotificationsReducer(opening, {
        type: 'show-merge-progress',
        step: 'merging-pages',
        progress: 42,
    });

    assert.equal(preparing, opening);
    assert.equal(progressed, opening);
});

test('does not replace an active merge with a file import', () => {
    const merging = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-merge-preparing',
    });

    assert.equal(appNotificationsReducer(merging, { type: 'show-opening-files' }), merging);
});

test('finishes only the merge loader', () => {
    const opening = appNotificationsReducer(initialAppNotificationsState, {
        type: 'show-opening-files',
    });

    assert.equal(appNotificationsReducer(opening, { type: 'finish-merge' }), opening);
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

test('finishes merge loading without touching status', () => {
    const state = appNotificationsReducer(
        {
            status: { kind: 'export-completed' },
            loading: { kind: 'merge-progress', step: 'merging-pages', progress: 88 },
        },
        { type: 'finish-merge' },
    );

    assert.deepEqual(state, {
        status: { kind: 'export-completed' },
        loading: null,
    });
});
