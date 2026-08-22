import assert from 'node:assert/strict';
import { test } from 'vitest';
import { ordersMatch, resolveReorderCommit } from './motion-reorder-session';

test('resolves a forward drag to one final store commit', () => {
    assert.deepEqual(resolveReorderCommit(['a', 'b', 'c', 'd'], ['b', 'c', 'a', 'd'], 'a'), {
        fromId: 'a',
        toId: 'c',
        position: 3,
    });
});

test('resolves a backward drag to one final store commit', () => {
    assert.deepEqual(resolveReorderCommit(['a', 'b', 'c', 'd'], ['a', 'd', 'b', 'c'], 'd'), {
        fromId: 'd',
        toId: 'b',
        position: 2,
    });
});

test('does not commit an unchanged or inconsistent drag session', () => {
    assert.equal(resolveReorderCommit(['a', 'b'], ['a', 'b'], 'a'), null);
    assert.equal(resolveReorderCommit(['a', 'b'], ['a', 'c'], 'a'), null);
    assert.equal(resolveReorderCommit(['a', 'a'], ['a', 'a'], 'a'), null);
    assert.equal(resolveReorderCommit(['a', 'b', 'c'], ['a', 'a', 'b'], 'b'), null);
});

test('compares order values rather than array identity', () => {
    assert.equal(ordersMatch(['a', 'b'], ['a', 'b']), true);
    assert.equal(ordersMatch(['a', 'b'], ['b', 'a']), false);
});
