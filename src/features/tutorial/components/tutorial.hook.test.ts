import assert from 'node:assert/strict';
import { test } from 'vitest';
import { resolveTutorialAutoStartEffect } from './tutorial.hook.js';

test('clears a pending auto-start timer when the workspace is no longer ready', () => {
    assert.equal(
        resolveTutorialAutoStartEffect({
            isReady: false,
            tutorialSeen: false,
            autoStartRequested: true,
            currentStep: null,
            hasPendingTimeout: true,
        }),
        'clear-timeout',
    );
});

test('arms auto-start only for a pending request in a ready inactive workspace', () => {
    assert.equal(
        resolveTutorialAutoStartEffect({
            isReady: true,
            tutorialSeen: false,
            autoStartRequested: true,
            currentStep: null,
            hasPendingTimeout: false,
        }),
        'arm-timeout',
    );

    assert.equal(
        resolveTutorialAutoStartEffect({
            isReady: true,
            tutorialSeen: false,
            autoStartRequested: false,
            currentStep: null,
            hasPendingTimeout: false,
        }),
        'none',
    );

    assert.equal(
        resolveTutorialAutoStartEffect({
            isReady: true,
            tutorialSeen: false,
            autoStartRequested: true,
            currentStep: 0,
            hasPendingTimeout: false,
        }),
        'none',
    );
});

test('cancels queued auto-start requests after the tutorial has been seen', () => {
    assert.equal(
        resolveTutorialAutoStartEffect({
            isReady: true,
            tutorialSeen: true,
            autoStartRequested: true,
            currentStep: null,
            hasPendingTimeout: true,
        }),
        'cancel-request',
    );
});
