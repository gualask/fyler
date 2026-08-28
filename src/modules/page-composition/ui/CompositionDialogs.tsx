import { useId, useRef, useState } from 'react';
import type { PasswordProtectedFile } from '@/capabilities/document-sources';
import { useTranslation } from '@/shared/i18n';
import { useModalFocus } from '@/shared/ui';

export function DiscardCompositionDialog({
    onCancel,
    onDiscard,
}: {
    onCancel: () => void;
    onDiscard: () => void;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const ref = useRef<HTMLDivElement | null>(null);
    useModalFocus({ containerRef: ref, onEscape: onCancel });
    return (
        <div className="dialog-backdrop dialog-backdrop-padded dialog-backdrop-strong">
            <div
                ref={ref}
                role="alertdialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="dialog-panel dialog-panel-bordered w-full max-w-md rounded-2xl p-6 outline-none"
            >
                <h2 id={titleId} className="text-lg font-semibold text-ui-text">
                    {t('pageComposition.discard.title')}
                </h2>
                <p className="mt-2 text-sm leading-6 text-ui-text-dim">
                    {t('pageComposition.discard.description')}
                </p>
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="btn-ghost" onClick={onCancel}>
                        {t('pageComposition.cancel')}
                    </button>
                    <button type="button" className="btn-danger" onClick={onDiscard}>
                        {t('pageComposition.discard.confirm')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function CompositionPasswordDialog({
    file,
    onCancel,
    onUnlock,
}: {
    file: PasswordProtectedFile;
    onCancel: () => void;
    onUnlock: (password: string) => Promise<boolean>;
}) {
    const { t } = useTranslation();
    const titleId = useId();
    const passwordId = useId();
    const ref = useRef<HTMLFormElement | null>(null);
    const [password, setPassword] = useState('');
    const [busy, setBusy] = useState(false);
    const [invalid, setInvalid] = useState(false);
    useModalFocus({ containerRef: ref, onEscape: busy ? undefined : onCancel });

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        setBusy(true);
        setInvalid(false);
        const unlocked = await onUnlock(password);
        if (!unlocked) {
            setBusy(false);
            setInvalid(true);
        }
    };
    return (
        <div className="dialog-backdrop dialog-backdrop-padded dialog-backdrop-strong">
            <form
                ref={ref}
                onSubmit={(event) => void submit(event)}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="dialog-panel dialog-panel-bordered w-full max-w-md rounded-2xl p-6 outline-none"
            >
                <h2 id={titleId} className="text-lg font-semibold text-ui-text">
                    {t('protectedPdf.title')}
                </h2>
                <p className="mt-2 text-sm text-ui-text-dim">{file.name}</p>
                <label
                    className="mt-5 block text-sm font-medium text-ui-text-secondary"
                    htmlFor={passwordId}
                >
                    {t('protectedPdf.passwordLabel')}
                </label>
                <input
                    id={passwordId}
                    autoComplete="off"
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="input-base mt-2 h-10"
                    aria-invalid={invalid}
                />
                {invalid ? (
                    <p role="alert" className="mt-2 text-sm text-ui-danger-soft-text">
                        {t('protectedPdf.invalidPassword')}
                    </p>
                ) : null}
                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" className="btn-ghost" onClick={onCancel} disabled={busy}>
                        {t('pageComposition.cancel')}
                    </button>
                    <button
                        type="submit"
                        className="btn-primary"
                        disabled={busy || password.length === 0}
                    >
                        {busy ? t('protectedPdf.unlocking') : t('protectedPdf.unlock')}
                    </button>
                </div>
            </form>
        </div>
    );
}
