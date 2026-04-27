import { describe, expect, test, vi } from 'vitest';
import { prependRecentQuickAddIds, removeQuickAddId } from './quick-add.reducer';
import { createQuickAddTransitionRunner } from './quick-add-transition.runner';

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

describe('createQuickAddTransitionRunner', () => {
    test('ignores overlapping transition runs until the active one completes', async () => {
        const runTransition = createQuickAddTransitionRunner();
        let releaseFirstTransition!: () => void;
        const firstTask = vi.fn(
            () =>
                new Promise<void>((resolve) => {
                    releaseFirstTransition = resolve;
                }),
        );
        const overlappingTask = vi.fn(async () => undefined);

        const firstTransition = runTransition(firstTask);
        await expect(runTransition(overlappingTask)).resolves.toEqual({ started: false });

        expect(firstTask).toHaveBeenCalledTimes(1);
        expect(overlappingTask).not.toHaveBeenCalled();

        releaseFirstTransition();
        await expect(firstTransition).resolves.toEqual({ started: true });

        const nextTask = vi.fn(async () => undefined);
        await expect(runTransition(nextTask)).resolves.toEqual({ started: true });
        expect(nextTask).toHaveBeenCalledTimes(1);
    });

    test('unlocks after a failed transition attempt', async () => {
        const runTransition = createQuickAddTransitionRunner();
        const failedTask = vi.fn(async () => {
            throw new Error('transition failed');
        });
        const nextTask = vi.fn(async () => undefined);

        await expect(runTransition(failedTask)).rejects.toThrow('transition failed');
        await expect(runTransition(nextTask)).resolves.toEqual({ started: true });

        expect(failedTask).toHaveBeenCalledTimes(1);
        expect(nextTask).toHaveBeenCalledTimes(1);
    });
});
