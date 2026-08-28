import assert from 'node:assert/strict';
import { test, vi } from 'vitest';

import { createAlwaysOnTopController } from './always-on-top.hook';

function createController(setAlwaysOnTop: (value: boolean) => Promise<void>) {
    const applied: boolean[] = [];
    const pending: boolean[] = [];
    const errors: unknown[] = [];
    const controller = createAlwaysOnTopController({
        applicationWindow: { setAlwaysOnTop },
        onApplied: (value) => applied.push(value),
        onPendingChange: (value) => pending.push(value),
        onError: (error) => errors.push(error),
    });

    return { controller, applied, pending, errors };
}

test('serializes a pending activation before disabling the window', async () => {
    let finishActivation: (() => void) | undefined;
    const setAlwaysOnTop = vi.fn(
        (value: boolean) =>
            new Promise<void>((resolve) => {
                if (value) finishActivation = resolve;
                else resolve();
            }),
    );
    const { controller, applied, pending, errors } = createController(setAlwaysOnTop);

    const activation = controller.change(true);
    const deactivation = controller.change(false);
    await Promise.resolve();

    assert.deepEqual(setAlwaysOnTop.mock.calls, [[true]]);
    finishActivation?.();
    assert.equal(await activation, true);
    assert.equal(await deactivation, true);
    assert.deepEqual(setAlwaysOnTop.mock.calls, [[true], [false]]);
    assert.deepEqual(applied, [true, false]);
    assert.deepEqual(pending, [true, false]);
    assert.deepEqual(errors, []);
});

test('reports a native error without changing the applied state', async () => {
    const error = new Error('window command failed');
    const { controller, applied, pending, errors } = createController(async () => {
        throw error;
    });

    assert.equal(await controller.change(true), false);
    assert.deepEqual(applied, []);
    assert.deepEqual(pending, [true, false]);
    assert.deepEqual(errors, [error]);
});
