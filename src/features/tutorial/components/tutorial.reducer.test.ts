import assert from 'node:assert/strict';
import { test } from 'vitest';
import { initialTutorialState, tutorialReducer } from './tutorial.reducer.js';

test('starts at the first tutorial step', () => {
    const state = tutorialReducer(initialTutorialState, { type: 'start' });
    assert.deepEqual(state, {
        currentStep: 0,
        autoStartRequested: false,
        markSeenOnClose: false,
    });
});

test('marks seen on close when advancing from the last step', () => {
    const state = tutorialReducer(
        {
            currentStep: 3,
            autoStartRequested: false,
            markSeenOnClose: false,
        },
        { type: 'next', totalSteps: 4 },
    );

    assert.deepEqual(state, {
        currentStep: null,
        autoStartRequested: false,
        markSeenOnClose: true,
    });
});

test('supports deferred auto start', () => {
    const requested = tutorialReducer(initialTutorialState, { type: 'request-auto-start' });
    const started = tutorialReducer(requested, { type: 'auto-start-fired' });

    assert.deepEqual(started, {
        currentStep: 0,
        autoStartRequested: false,
        markSeenOnClose: false,
    });
});

test('can clear the mark-seen flag after handling it', () => {
    const state = tutorialReducer(
        {
            currentStep: null,
            autoStartRequested: false,
            markSeenOnClose: true,
        },
        { type: 'mark-seen-handled' },
    );

    assert.deepEqual(state, {
        currentStep: null,
        autoStartRequested: false,
        markSeenOnClose: false,
    });
});
