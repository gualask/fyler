import { describe, expect, test, vi } from 'vitest';
import {
    applyQuickAddWindow,
    captureQuickAddRestoreSize,
    type QuickAddWindowOps,
    restoreNormalWindow,
} from './quick-add-window-transition';

function createWindowOps(overrides: Partial<QuickAddWindowOps> = {}) {
    const calls: string[] = [];
    const ops: QuickAddWindowOps = {
        getLogicalSize: vi.fn(async () => ({ width: 1240, height: 760 })),
        setSize: vi.fn(async (width, height) => {
            calls.push(`size:${width}x${height}`);
        }),
        setAlwaysOnTop: vi.fn(async (flag) => {
            calls.push(`top:${flag}`);
        }),
        setMinSize: vi.fn(async (width, height) => {
            calls.push(`min:${width}x${height}`);
        }),
        setMaxSize: vi.fn(async (size) => {
            calls.push(size ? `max:${size.width}x${size.height}` : 'max:null');
        }),
        setMaximizable: vi.fn(async (flag) => {
            calls.push(`maximizable:${flag}`);
        }),
        ...overrides,
    };

    return { calls, ops };
}

describe('captureQuickAddRestoreSize', () => {
    test('uses the current logical size when available', async () => {
        const { ops } = createWindowOps();

        await expect(captureQuickAddRestoreSize(ops)).resolves.toEqual({
            width: 1240,
            height: 760,
        });
    });

    test('falls back when the current logical size cannot be read', async () => {
        const { ops } = createWindowOps({
            getLogicalSize: vi.fn(async () => {
                throw new Error('size unavailable');
            }),
        });

        await expect(captureQuickAddRestoreSize(ops)).resolves.toEqual({
            width: 1100,
            height: 700,
        });
    });
});

describe('applyQuickAddWindow', () => {
    test('applies compact quick add window constraints in order', async () => {
        const { calls, ops } = createWindowOps();

        await applyQuickAddWindow(ops, { width: 1240, height: 760 });

        expect(calls).toEqual([
            'min:380x520',
            'max:380x520',
            'maximizable:false',
            'size:380x520',
            'top:true',
        ]);
    });

    test('restores normal window constraints and preserves the original error on failure', async () => {
        const error = new Error('compact size failed');
        const { calls, ops } = createWindowOps({
            setSize: vi.fn(async (width, height) => {
                calls.push(`size:${width}x${height}`);
                if (width === 380) throw error;
            }),
        });

        await expect(applyQuickAddWindow(ops, { width: 1240, height: 760 })).rejects.toBe(error);

        expect(calls).toEqual([
            'min:380x520',
            'max:380x520',
            'maximizable:false',
            'size:380x520',
            'maximizable:true',
            'max:null',
            'size:1240x760',
            'min:1100x600',
            'top:false',
        ]);
    });
});

describe('restoreNormalWindow', () => {
    test('restores normal window constraints in order', async () => {
        const { calls, ops } = createWindowOps();

        await restoreNormalWindow(ops, { width: 1240, height: 760 });

        expect(calls).toEqual([
            'maximizable:true',
            'max:null',
            'size:1240x760',
            'min:1100x600',
            'top:false',
        ]);
    });

    test('propagates native restore failures', async () => {
        const error = new Error('always on top failed');
        const { ops } = createWindowOps({
            setAlwaysOnTop: vi.fn(async () => {
                throw error;
            }),
        });

        await expect(restoreNormalWindow(ops, { width: 1240, height: 760 })).rejects.toBe(error);
    });
});
