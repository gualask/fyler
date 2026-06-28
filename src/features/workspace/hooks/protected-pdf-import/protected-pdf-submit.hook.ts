import { type Dispatch, type SetStateAction, useCallback } from 'react';
import type { PasswordProtectedFile } from '@/shared/domain';
import type { ShowNextPasswordImportOrFinish } from './protected-pdf-dialog-controller.hook';
import type { ProtectedPdfPasswordDialogData } from './protected-pdf-dialog-state';
import {
    appendUnlockedFile,
    currentPasswordImport,
    type PasswordSubmission,
    passwordDialogError,
    passwordSubmissionFromDialog,
    type RecordDiagnostic,
    type UnlockProtectedPdf,
    unlockRemainingWithPassword,
} from './protected-pdf-import.logic';
import type { PendingPasswordImportRef, UnlockInFlightRef } from './protected-pdf-import.refs';

export function useProtectedPdfSubmit({
    dialog,
    pendingRef,
    unlockInFlightRef,
    setDialog,
    record,
    unlockOne,
    showNextOrFinish,
}: {
    dialog: ProtectedPdfPasswordDialogData;
    pendingRef: PendingPasswordImportRef;
    unlockInFlightRef: UnlockInFlightRef;
    setDialog: Dispatch<SetStateAction<ProtectedPdfPasswordDialogData>>;
    record: RecordDiagnostic;
    unlockOne: UnlockProtectedPdf;
    showNextOrFinish: ShowNextPasswordImportOrFinish;
}) {
    const { isChecking, password, tryForRemaining } = dialog;

    const submitPassword = useCallback(
        async ({ pending, current, password, tryForRemaining }: PasswordSubmission) => {
            appendUnlockedFile(pending, await unlockOne(current, password));
            const remaining = pending.queue.slice(1);

            if (tryForRemaining && remaining.length > 0) {
                pending.queue = await unlockRemainingWithPassword(
                    pending,
                    remaining,
                    password,
                    unlockOne,
                    record,
                );
                showNextOrFinish(pending, 'previous-password-failed');
                return;
            }

            pending.queue = remaining;
            showNextOrFinish(pending);
        },
        [record, showNextOrFinish, unlockOne],
    );

    const failCurrentUnlock = useCallback(
        (current: PasswordProtectedFile, error: unknown) => {
            const dialogError = passwordDialogError(error);
            unlockInFlightRef.current = false;
            record({
                category: 'files',
                severity: dialogError === 'invalid-password' ? 'warn' : 'error',
                message: 'Password-protected PDF unlock failed',
                metadata: { name: current.name },
            });
            setDialog((state) => ({
                ...state,
                error: dialogError,
                isChecking: false,
            }));
        },
        [record, setDialog, unlockInFlightRef],
    );

    return useCallback(() => {
        const submission = currentPasswordImport(pendingRef.current);
        if (!submission || isChecking || unlockInFlightRef.current) return;

        const passwordSubmission = passwordSubmissionFromDialog(
            submission,
            password,
            tryForRemaining,
        );
        if (!passwordSubmission) return;

        unlockInFlightRef.current = true;
        setDialog((state) => ({ ...state, error: null, isChecking: true }));
        void submitPassword(passwordSubmission).catch((error) => {
            failCurrentUnlock(passwordSubmission.current, error);
        });
    }, [
        failCurrentUnlock,
        isChecking,
        password,
        pendingRef,
        setDialog,
        submitPassword,
        tryForRemaining,
        unlockInFlightRef,
    ]);
}
