export interface QuickAddWindowSize {
    width: number;
    height: number;
}

export interface QuickAddWindowOps {
    getLogicalSize: () => Promise<QuickAddWindowSize>;
    setSize: (width: number, height: number) => Promise<void>;
    setAlwaysOnTop: (flag: boolean) => Promise<void>;
    setMinSize: (width: number, height: number) => Promise<void>;
    setMaxSize: (size: QuickAddWindowSize | null) => Promise<void>;
    setMaximizable: (flag: boolean) => Promise<void>;
}

export const QUICK_ADD_WINDOW_SIZE = { width: 380, height: 520 } as const;
export const NORMAL_WINDOW_MIN_SIZE = { width: 1100, height: 600 } as const;
export const FALLBACK_RESTORE_SIZE = { width: 1100, height: 700 } as const;

export async function captureQuickAddRestoreSize(
    ops: QuickAddWindowOps,
): Promise<QuickAddWindowSize> {
    return ops.getLogicalSize().catch(() => FALLBACK_RESTORE_SIZE);
}

export async function restoreNormalWindow(
    ops: QuickAddWindowOps,
    restoreSize: QuickAddWindowSize | null,
): Promise<void> {
    await ops.setMaximizable(true);
    await ops.setMaxSize(null);
    if (restoreSize) {
        await ops.setSize(restoreSize.width, restoreSize.height);
    }
    await ops.setMinSize(NORMAL_WINDOW_MIN_SIZE.width, NORMAL_WINDOW_MIN_SIZE.height);
    await ops.setAlwaysOnTop(false);
}

export async function applyQuickAddWindow(
    ops: QuickAddWindowOps,
    restoreSize: QuickAddWindowSize,
): Promise<void> {
    try {
        await ops.setMinSize(QUICK_ADD_WINDOW_SIZE.width, QUICK_ADD_WINDOW_SIZE.height);
        await ops.setMaxSize(QUICK_ADD_WINDOW_SIZE);
        await ops.setMaximizable(false);
        await ops.setSize(QUICK_ADD_WINDOW_SIZE.width, QUICK_ADD_WINDOW_SIZE.height);
        await ops.setAlwaysOnTop(true);
    } catch (error) {
        await restoreNormalWindow(ops, restoreSize).catch(() => undefined);
        throw error;
    }
}
