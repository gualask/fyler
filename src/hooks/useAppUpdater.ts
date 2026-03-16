import { useState, useEffect, useCallback } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';

interface UpdateState {
    available: boolean;
    version: string | null;
    installing: boolean;
    progress: number | null;
    dismissed: boolean;
}

export function useAppUpdater() {
    const [state, setState] = useState<UpdateState>({
        available: false,
        version: null,
        installing: false,
        progress: null,
        dismissed: false,
    });
    const [update, setUpdate] = useState<Update | null>(null);

    useEffect(() => {
        let cancelled = false;
        check()
            .then((u) => {
                if (cancelled || !u?.available) return;
                setUpdate(u);
                setState((s) => ({ ...s, available: true, version: u.version }));
            })
            .catch(() => {
                // Silently ignore — dev mode or no network
            });
        return () => { cancelled = true; };
    }, []);

    const downloadAndInstall = useCallback(async () => {
        if (!update) return;
        setState((s) => ({ ...s, installing: true, progress: 0 }));

        let totalBytes = 0;
        let downloadedBytes = 0;

        await update.downloadAndInstall((event) => {
            if (event.event === 'Started' && event.data.contentLength) {
                totalBytes = event.data.contentLength;
            } else if (event.event === 'Progress') {
                downloadedBytes += event.data.chunkLength;
                const pct = totalBytes > 0 ? Math.round((downloadedBytes / totalBytes) * 100) : null;
                setState((s) => ({ ...s, progress: pct }));
            }
        });

        await relaunch();
    }, [update]);

    const dismiss = useCallback(() => {
        setState((s) => ({ ...s, dismissed: true }));
    }, []);

    return {
        updateAvailable: state.available && !state.dismissed,
        updateVersion: state.version,
        installing: state.installing,
        progress: state.progress,
        downloadAndInstall,
        dismiss,
    };
}
