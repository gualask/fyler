import assert from 'node:assert/strict';
import { test } from 'vitest';
import { initialTutorialState, tutorialReducer } from './tutorial.reducer.js';
import { TUTORIAL_ESSENTIAL_STEP_COUNT, TUTORIAL_STEPS } from './tutorial.steps.js';

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
            currentStep: TUTORIAL_STEPS.length - 1,
            autoStartRequested: false,
            markSeenOnClose: false,
        },
        { type: 'next', totalSteps: TUTORIAL_STEPS.length },
    );

    assert.deepEqual(state, {
        currentStep: null,
        autoStartRequested: false,
        markSeenOnClose: true,
    });
});

test('can continue from the essential finish point into optional steps', () => {
    const state = tutorialReducer(
        {
            currentStep: TUTORIAL_ESSENTIAL_STEP_COUNT - 1,
            autoStartRequested: false,
            markSeenOnClose: false,
        },
        { type: 'next', totalSteps: TUTORIAL_STEPS.length },
    );

    assert.deepEqual(state, {
        currentStep: TUTORIAL_ESSENTIAL_STEP_COUNT,
        autoStartRequested: false,
        markSeenOnClose: false,
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
