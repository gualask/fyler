import { relaunch } from '@tauri-apps/plugin-process';
import { check } from '@tauri-apps/plugin-updater';

export type AvailableUpdate = {
    version: string;
    downloadAndInstall: (onProgress: (pct: number | null) => void) => Promise<void>;
};

export async function checkForUpdate(): Promise<AvailableUpdate | null> {
    const update = await check();
    if (!update?.available) return null;

    return {
        version: update.version,
        downloadAndInstall: async (onProgress) => {
            let totalBytes = 0;
            let downloadedBytes = 0;

            await update.downloadAndInstall((event) => {
                if (event.event === 'Started' && event.data.contentLength) {
                    totalBytes = event.data.contentLength;
                    onProgress(0);
                    return;
                }
                if (event.event === 'Progress') {
                    downloadedBytes += event.data.chunkLength;
                    const pct =
                        totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : null;
                    onProgress(pct);
                }
            });
        },
    };
}

export async function relaunchApp(): Promise<void> {
    await relaunch();
}
