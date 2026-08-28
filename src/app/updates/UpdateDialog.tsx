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

function UpdateError({ error }: { error: string }) {
    const { t } = useTranslation();
    return (
        <p
            role="alert"
            className="mt-3 rounded-lg bg-ui-danger-soft px-3 py-2 text-xs text-ui-danger-soft-text"
        >
            {t('status.errorPrefix', { message: error })}
        </p>
    );
}

function UpdateProgress({ progress }: { progress: number | null }) {
    const { t } = useTranslation();
    const normalizedProgress = Math.min(100, Math.max(0, progress ?? 0));

    return (
        <div className="mt-4">
            <div
                className="h-2 w-full overflow-hidden rounded-full bg-ui-border"
                role="progressbar"
                aria-label={t('update.installing')}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={progress == null ? undefined : normalizedProgress}
            >
                <div
                    className="h-full origin-left rounded-full bg-ui-accent transition-transform duration-300 motion-reduce:transition-none"
                    style={{ transform: `scaleX(${normalizedProgress / 100})` }}
                />
            </div>
            <p role="status" aria-live="polite" className="mt-1 text-xs text-ui-text-muted">
                {progress != null
                    ? t('update.progress', { percent: String(normalizedProgress) })
                    : t('update.installing')}
            </p>
        </div>
    );
}

function UpdateActions({
    onInstall,
    onDismiss,
}: Pick<UpdateDialogViewProps, 'onInstall' | 'onDismiss'>) {
    const { t } = useTranslation();
    return (
        <div className="mt-5 flex justify-end gap-2">
            <button type="button" className="btn-ghost" onClick={onDismiss}>
                {t('update.notNow')}
            </button>
            <button type="button" className="btn-primary" onClick={onInstall}>
                {t('update.install')}
            </button>
        </div>
    );
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
        <div className="dialog-backdrop">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="dialog-panel w-full max-w-sm rounded-xl p-6 outline-none"
            >
                <h2 id={titleId} className="text-base font-semibold text-ui-text">
                    {t('update.title')}
                </h2>
                <p id={descriptionId} className="mt-2 text-sm text-ui-text-muted">
                    {t('update.message', { version: updateVersion ?? '' })}
                </p>

                {error ? <UpdateError error={error} /> : null}
                {installing ? <UpdateProgress progress={progress} /> : null}
                {!installing ? <UpdateActions onInstall={onInstall} onDismiss={onDismiss} /> : null}
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
