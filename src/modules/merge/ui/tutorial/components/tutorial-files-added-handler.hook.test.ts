import assert from 'node:assert/strict';
import { test } from 'vitest';
import { shouldRequestTutorialAutoStart } from './tutorial-files-added-handler.hook.js';

test('requests tutorial auto-start only for real files added to an empty workspace', () => {
    assert.equal(
        shouldRequestTutorialAutoStart({
            ids: ['file-1'],
            wasWorkspaceEmpty: true,
        }),
        true,
    );

    assert.equal(
        shouldRequestTutorialAutoStart({
            ids: [],
            wasWorkspaceEmpty: true,
        }),
        false,
    );

    assert.equal(
        shouldRequestTutorialAutoStart({
            ids: ['file-2'],
            wasWorkspaceEmpty: false,
        }),
        false,
    );
});
