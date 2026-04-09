import { useCallback, useEffect, useState } from 'react';

import { type AvailableUpdate, checkForUpdate, relaunchApp } from '@/infra/platform/updater';
import { useDiagnostics } from '@/shared/diagnostics';
import { getErrorMessage } from '@/shared/errors';

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
    const [update, setUpdate] = useState<AvailableUpdate | null>(null);

    useEffect(() => {
        let cancelled = false;
        checkForUpdate()
            .then((u) => {
                if (cancelled || !u) return;
                setUpdate(u);
                setState((s) => ({ ...s, available: true, version: u.version }));
            })
            .catch(() => {
                // Silently ignore — dev mode or no network
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const downloadAndInstall = useCallback(async () => {
        if (!update) return;
        setState((s) => ({ ...s, installing: true, progress: 0, error: null }));

        try {
            await update.downloadAndInstall((pct) => {
                setState((s) => ({ ...s, progress: pct }));
            });

            await relaunchApp();
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
