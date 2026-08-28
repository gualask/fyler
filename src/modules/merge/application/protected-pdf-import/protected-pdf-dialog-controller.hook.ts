import { type Dispatch, type SetStateAction, useCallback } from 'react';
import {
    CLOSED_DIALOG,
    openedDialog,
    type ProtectedPdfPasswordDialogData,
} from './protected-pdf-dialog-state';
import {
    type PasswordDialogError,
    type PendingPasswordImport,
    resolvedImportFiles,
} from './protected-pdf-import.logic';
import type { PendingPasswordImportRef, UnlockInFlightRef } from './protected-pdf-import.refs';

export type ShowCurrentPasswordImport = (
    pending: PendingPasswordImport,
    overrides?: Partial<ProtectedPdfPasswordDialogData>,
) => void;

export type FinishPendingPasswordImport = () => void;

export type ShowNextPasswordImportOrFinish = (
    pending: PendingPasswordImport,
    error?: PasswordDialogError,
) => void;

export function useProtectedPdfDialogController({
    pendingRef,
    unlockInFlightRef,
    setDialog,
}: {
    pendingRef: PendingPasswordImportRef;
    unlockInFlightRef: UnlockInFlightRef;
    setDialog: Dispatch<SetStateAction<ProtectedPdfPasswordDialogData>>;
}) {
    const showCurrent: ShowCurrentPasswordImport = useCallback(
        (
            pending: PendingPasswordImport,
            overrides: Partial<ProtectedPdfPasswordDialogData> = {},
        ) => {
            setDialog((current) => openedDialog(current, pending, overrides));
        },
        [setDialog],
    );

    const finishPending: FinishPendingPasswordImport = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending) return;
        pendingRef.current = null;
        unlockInFlightRef.current = false;
        setDialog(CLOSED_DIALOG);
        pending.resolve(resolvedImportFiles(pending));
    }, [pendingRef, setDialog, unlockInFlightRef]);

    const showNextOrFinish: ShowNextPasswordImportOrFinish = useCallback(
        (pending: PendingPasswordImport, error?: PasswordDialogError) => {
            if (pending.queue.length === 0) {
                finishPending();
                return;
            }

            unlockInFlightRef.current = false;
            showCurrent(pending, error ? { error } : undefined);
        },
        [finishPending, showCurrent, unlockInFlightRef],
    );

    return {
        showCurrent,
        finishPending,
        showNextOrFinish,
    };
}
