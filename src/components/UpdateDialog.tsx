import { useTranslation } from '../i18n';
import { useAppUpdater } from '../hooks/useAppUpdater';

export function UpdateDialog() {
    const { t } = useTranslation();
    const { updateAvailable, updateVersion, installing, progress, downloadAndInstall, dismiss } = useAppUpdater();

    if (!updateAvailable) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
            <div className="w-full max-w-sm rounded-xl bg-ui-surface p-6 shadow-2xl">
                <h2 className="text-base font-semibold text-ui-text">
                    {t('update.title')}
                </h2>
                <p className="mt-2 text-sm text-ui-muted">
                    {t('update.message', { version: updateVersion ?? '' })}
                </p>

                {installing && (
                    <div className="mt-4">
                        <div className="h-2 w-full overflow-hidden rounded-full bg-ui-border">
                            <div
                                className="h-full rounded-full bg-accent-solid transition-all duration-300"
                                style={{ width: `${progress ?? 0}%` }}
                            />
                        </div>
                        <p className="mt-1 text-xs text-ui-muted">
                            {progress != null
                                ? t('update.progress', { percent: String(progress) })
                                : t('update.installing')}
                        </p>
                    </div>
                )}

                {!installing && (
                    <div className="mt-5 flex justify-end gap-2">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={dismiss}
                        >
                            {t('update.notNow')}
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={() => void downloadAndInstall()}
                        >
                            {t('update.install')}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
