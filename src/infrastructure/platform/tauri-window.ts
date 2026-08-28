import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';

import type { ApplicationWindowPort } from '@/capabilities/application-window';

/** Native application-window adapter. */
export const tauriApplicationWindow: ApplicationWindowPort = {
    getLogicalSize: async () => {
        const win = getCurrentWindow();
        const physical = await win.innerSize();
        const scale = await win.scaleFactor();
        return physical.toLogical(scale);
    },
    setSize: async (width, height) => getCurrentWindow().setSize(new LogicalSize(width, height)),
    setAlwaysOnTop: async (flag) => getCurrentWindow().setAlwaysOnTop(flag),
    setMinSize: async (width, height) =>
        getCurrentWindow().setMinSize(new LogicalSize(width, height)),
};
