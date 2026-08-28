import assert from 'node:assert/strict';
import { test } from 'vitest';

import {
    isMergeOperationProgressPayload,
    isOperationProgressPayload,
    isPageCompositionOperationProgressPayload,
    OPERATION_PROGRESS_EVENT,
    OPERATION_PROGRESS_VERSION,
} from '@/shared/contracts/operation-progress';

test('accepts the versioned merge operation-progress payload', () => {
    assert.equal(OPERATION_PROGRESS_EVENT, 'operation-progress');
    assert.equal(
        isOperationProgressPayload({
            version: OPERATION_PROGRESS_VERSION,
            operation: 'merge',
            phase: 'saving',
            percentage: 100,
        }),
        true,
    );
    assert.equal(
        isPageCompositionOperationProgressPayload({
            version: OPERATION_PROGRESS_VERSION,
            operation: 'page-composition',
            phase: 'composing',
            percentage: 50,
        }),
        true,
    );
    assert.equal(
        isMergeOperationProgressPayload({
            version: OPERATION_PROGRESS_VERSION,
            operation: 'merge',
            phase: 'saving',
            percentage: 100,
        }),
        true,
    );
    assert.equal(
        isOperationProgressPayload({
            version: OPERATION_PROGRESS_VERSION,
            operation: 'page-composition',
            phase: 'composing',
            percentage: 50,
        }),
        true,
    );
});

test('rejects stale, foreign, and out-of-range progress payloads', () => {
    const base = {
        version: OPERATION_PROGRESS_VERSION,
        operation: 'merge',
        phase: 'saving',
        percentage: 100,
    };

    assert.equal(isOperationProgressPayload({ ...base, version: 0 }), false);
    assert.equal(isOperationProgressPayload({ ...base, operation: 'page-composition' }), true);
    assert.equal(isMergeOperationProgressPayload({ ...base, phase: 'unknown' }), false);
    assert.equal(isOperationProgressPayload({ ...base, percentage: 101 }), false);
    assert.equal(isOperationProgressPayload({ ...base, percentage: 12.5 }), false);
    assert.equal(isMergeOperationProgressPayload({ ...base, phase: 'composing' }), false);
    assert.equal(
        isPageCompositionOperationProgressPayload({
            ...base,
            operation: 'page-composition',
            phase: 'merging-pages',
        }),
        false,
    );
});
