import { describe, expect, test } from 'vitest';
import { prependRecentQuickAddIds, removeQuickAddId } from './quick-add.hook';

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
