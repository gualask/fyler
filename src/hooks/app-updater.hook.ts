import { useState, useEffect, useCallback } from 'react';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import { useDiagnostics } from '@/diagnostics';
import { getErrorMessage } from '@/errors';

interface UpdateState {
    available: boolean;
    version: string | null;
    installing: boolean;
    progress: number | null;
    dismissed: boolean;
    error: string | null;
}

export function useAppUpdater() {
    const { record } = useDiagnostics();
    const [state, setState] = useState<UpdateState>({
        available: false,
        version: null,
        installing: false,
        progress: null,
        dismissed: false,
        error: null,
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
        setState((s) => ({ ...s, installing: true, progress: 0, error: null }));

        let totalBytes = 0;
        let downloadedBytes = 0;

        try {
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
        } catch (error) {
            record({
                category: 'update',
                severity: 'error',
                message: `Updater install failed: ${getErrorMessage(error)}`,
            });
            setState((s) => ({
                ...s,
                installing: false,
                progress: null,
                error: getErrorMessage(error),
            }));
        }
    }, [record, update]);

    const dismiss = useCallback(() => {
        setState((s) => ({ ...s, dismissed: true, error: null }));
    }, []);

    return {
        updateAvailable: state.available && !state.dismissed,
        updateVersion: state.version,
        installing: state.installing,
        progress: state.progress,
        error: state.error,
        downloadAndInstall,
        dismiss,
    };
}
