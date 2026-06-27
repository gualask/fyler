import { useId, useRef } from 'react';

import { useTranslation } from '@/shared/i18n';
import { useModalFocus } from '@/shared/ui';
import type { ProtectedPdfPasswordDialogState } from '../../hooks/protected-pdf-import.hook';
import { DialogActions } from './DialogActions';
import { DialogHeader } from './DialogHeader';
import { PasswordField } from './PasswordField';
import { ProtectedFileSummary } from './ProtectedFileSummary';
import { TryForRemainingControl } from './TryForRemainingControl';

type Props = {
    state: ProtectedPdfPasswordDialogState;
};

type PasswordDialogError = ProtectedPdfPasswordDialogState['error'];
type PasswordDialogErrorMessages = Record<Exclude<PasswordDialogError, null>, string>;

function passwordDialogErrorMessage(
    error: PasswordDialogError,
    messages: PasswordDialogErrorMessages,
): string | null {
    if (!error) return null;
    return messages[error];
}

export function ProtectedPdfPasswordDialog({ state }: Props) {
    const { t } = useTranslation();
    const dialogRef = useRef<HTMLDivElement | null>(null);
    const titleId = useId();
    const descriptionId = useId();
    const passwordId = useId();
    const errorId = useId();

    useModalFocus({
        active: state.open,
        containerRef: dialogRef,
        onEscape: state.isChecking ? undefined : state.onSkipCurrent,
    });

    if (!state.open || !state.file) return null;

    const hasRemainingFiles = state.currentIndex < state.totalCount;
    const errorMessage = passwordDialogErrorMessage(state.error, {
        'previous-password-failed': t('protectedPdf.previousPasswordFailed'),
        'invalid-password': t('protectedPdf.invalidPassword'),
        'unlock-failed': t('protectedPdf.unlockFailed'),
    });

    return (
        <div className="dialog-backdrop dialog-backdrop-padded">
            <div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descriptionId}
                tabIndex={-1}
                className="dialog-panel dialog-panel-bordered w-full max-w-md rounded-2xl"
            >
                <DialogHeader
                    titleId={titleId}
                    descriptionId={descriptionId}
                    title={t('protectedPdf.title')}
                    body={t('protectedPdf.body')}
                    counter={t('protectedPdf.counter', {
                        current: state.currentIndex,
                        total: state.totalCount,
                    })}
                />

                <div className="space-y-5 px-6 py-5">
                    <ProtectedFileSummary file={state.file} />
                    <PasswordField
                        passwordId={passwordId}
                        errorId={errorId}
                        label={t('protectedPdf.passwordLabel')}
                        placeholder={t('protectedPdf.passwordPlaceholder')}
                        password={state.password}
                        disabled={state.isChecking}
                        errorMessage={errorMessage}
                        onPasswordChange={state.onPasswordChange}
                        onSubmit={state.onSubmit}
                    />
                    <TryForRemainingControl
                        visible={hasRemainingFiles}
                        checked={state.tryForRemaining}
                        disabled={state.isChecking}
                        label={t('protectedPdf.tryForRemaining')}
                        onChange={state.onTryForRemainingChange}
                    />
                </div>

                <DialogActions
                    hasRemainingFiles={hasRemainingFiles}
                    canSubmit={Boolean(state.password)}
                    isChecking={state.isChecking}
                    skipFileLabel={t('protectedPdf.skipFile')}
                    skipAllLabel={t('protectedPdf.skipAll')}
                    unlockLabel={t('protectedPdf.unlock')}
                    unlockingLabel={t('protectedPdf.unlocking')}
                    onSkipCurrent={state.onSkipCurrent}
                    onSkipAll={state.onSkipAll}
                    onSubmit={state.onSubmit}
                />
            </div>
        </div>
    );
}
