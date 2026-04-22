import { describe, expect, test } from 'vitest';
import {
    initialQuickAddState,
    prependRecentQuickAddIds,
    quickAddReducer,
    removeQuickAddId,
} from './quick-add.reducer';

describe('prependRecentQuickAddIds', () => {
    test('prepends the latest batch while preserving the batch order', () => {
        expect(prependRecentQuickAddIds(['a', 'b'], ['c', 'd'])).toEqual(['c', 'd', 'a', 'b']);
    });

    test('moves re-added ids to the front without duplicating old entries', () => {
        expect(prependRecentQuickAddIds(['a', 'b', 'c'], ['c', 'd'])).toEqual(['c', 'd', 'a', 'b']);
    });
});

describe('removeQuickAddId', () => {
    test('removes the file from the quick add session order', () => {
        expect(removeQuickAddId(['c', 'd', 'a', 'b'], 'a')).toEqual(['c', 'd', 'b']);
    });
});

describe('quickAddReducer', () => {
    test('tracks entering quick add mode', () => {
        expect(quickAddReducer(initialQuickAddState, { type: 'enter-started' })).toEqual({
            isQuickAdd: false,
            isTransitioning: true,
            quickAddFileOrder: [],
            isQuickAddSessionActive: true,
        });
    });

    test('tracks active quick add session files', () => {
        const entered = quickAddReducer(initialQuickAddState, { type: 'enter-started' });
        const withFiles = quickAddReducer(entered, { type: 'files-added', ids: ['c', 'd'] });

        expect(withFiles.quickAddFileOrder).toEqual(['c', 'd']);
    });

    test('ignores file updates after exit starts', () => {
        const state = quickAddReducer(
            {
                isQuickAdd: true,
                isTransitioning: false,
                quickAddFileOrder: ['a'],
                isQuickAddSessionActive: true,
            },
            { type: 'exit-started' },
        );

        expect(
            quickAddReducer(state, { type: 'files-added', ids: ['b'] }).quickAddFileOrder,
        ).toEqual(['a']);
    });
});
