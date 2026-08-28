import assert from 'node:assert/strict';
import { test, vi } from 'vitest';

import type { ApplicationWindowPort } from '@/capabilities/application-window';
import { applyAppWindowProfile } from './app-window-profile';

function createWindowPort() {
    const calls: Array<[operation: 'min' | 'size', width: number, height: number]> = [];
    const applicationWindow: ApplicationWindowPort = {
        getLogicalSize: async () => ({ width: 1100, height: 700 }),
        setAlwaysOnTop: async () => undefined,
        setMinSize: async (width, height) => {
            calls.push(['min', width, height]);
        },
        setSize: async (width, height) => {
            calls.push(['size', width, height]);
        },
    };
    return { applicationWindow, calls };
}

test.each(['home', 'merge', 'page-composition', 'batch-compression'] as const)(
    'applies the normal geometry to %s',
    async (profile) => {
        const { applicationWindow, calls } = createWindowPort();

        await applyAppWindowProfile(applicationWindow, profile, () => true);

        assert.deepEqual(calls, [
            ['min', 1100, 700],
            ['size', 1100, 700],
        ]);
    },
);

test('does not resize after a superseded profile change', async () => {
    let active = true;
    const setSize = vi.fn(async () => undefined);
    const applicationWindow: ApplicationWindowPort = {
        getLogicalSize: async () => ({ width: 1100, height: 700 }),
        setAlwaysOnTop: async () => undefined,
        setMinSize: async () => {
            active = false;
        },
        setSize,
    };

    await applyAppWindowProfile(applicationWindow, 'page-composition', () => active);

    assert.equal(setSize.mock.calls.length, 0);
});
