import { useCallback, useEffect, useReducer } from 'react';

import { checkForUpdate, relaunchApp } from '@/infra/platform/updater';
import { useDiagnostics } from '@/shared/diagnostics';
import { getErrorMessage } from '@/shared/errors';
import { appUpdaterReducer, initialAppUpdaterState } from './app-updater.reducer';

export function useAppUpdater() {
    const { record } = useDiagnostics();
    const [state, dispatch] = useReducer(appUpdaterReducer, initialAppUpdaterState);
    const update = state.update;

    useEffect(() => {
        let cancelled = false;
        checkForUpdate()
            .then((u) => {
                if (cancelled || !u) return;
                dispatch({ type: 'update-found', update: u });
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
        dispatch({ type: 'install-started' });

        try {
            await update.downloadAndInstall((pct) => {
                dispatch({ type: 'install-progress', progress: pct });
            });

            await relaunchApp();
        } catch (error) {
            record({
                category: 'update',
                severity: 'error',
                message: `Updater install failed: ${getErrorMessage(error)}`,
            });
            dispatch({ type: 'install-failed', error: getErrorMessage(error) });
        }
    }, [record, update]);

    const dismiss = useCallback(() => {
        dispatch({ type: 'dismissed' });
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
