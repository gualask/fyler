import { useId, useRef } from 'react';
import { useTranslation } from '@/shared/i18n';
import { useModalFocus } from '@/shared/ui';
import { useAppUpdater } from './app-updater.hook';

interface UpdateDialogViewProps {
    updateVersion: string | null;
    installing: boolean;
    progress: number | null;
    error: string | null;
    onInstall: () => void;
    onDismiss: () => void;
}

export function UpdateDialogView({
    updateVersion,
    installing,
    progress,
    error,
    onInstall,
    onDismiss,
}: UpdateDialogViewProps) {
    const { t } = useTranslation();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const descriptionId = useId();

    useModalFocus({
        containerRef: dialogRef,
        onEscape: installing ? undefined : onDismiss,
    });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="w-full max-w-sm rounded-xl bg-ui-surface p-6 shadow-2xl"
            >
                <h2 id={titleId} className="text-base font-semibold text-ui-text">
                    {t('update.title')}
                </h2>
                <p id={descriptionId} className="mt-2 text-sm text-ui-text-muted">
                    {t('update.message', { version: updateVersion ?? '' })}
                </p>

                {error && (
                    <p className="mt-3 rounded-lg bg-ui-danger-soft px-3 py-2 text-xs text-ui-danger">
                        {t('status.errorPrefix', { message: error })}
                    </p>
                )}

                {installing && (
                    <div className="mt-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ui-border">
                            <div
                                className="h-full rounded-full bg-ui-accent transition-[width] duration-300"
                                style={{ width: `${progress ?? 0}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-ui-text-muted">
                            {progress != null
                                ? t('update.progress', { percent: String(progress) })
                                : t('update.installing')}
                        </p>
                    </div>
                )}

                {!installing && (
                    <div className="mt-5 flex justify-end gap-2">
                        <button type="button" className="btn-ghost" onClick={onDismiss}>
                            {t('update.notNow')}
                        </button>
                        <button type="button" className="btn-primary" onClick={onInstall}>
                            {t('update.install')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export function UpdateDialog() {
    const {
        updateAvailable,
        updateVersion,
        installing,
        progress,
        error,
        downloadAndInstall,
        dismiss,
    } = useAppUpdater();

    if (!updateAvailable) return null;

    return (
        <UpdateDialogView
            updateVersion={updateVersion}
            installing={installing}
            progress={progress}
            error={error}
            onInstall={() => void downloadAndInstall()}
            onDismiss={dismiss}
        />
    );
}
