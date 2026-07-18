import { useRef, useState } from 'react';
import { useDiagnostics } from '@/shared/diagnostics';
import { useProtectedPdfDialogController } from './protected-pdf-dialog-controller.hook';
import { CLOSED_DIALOG } from './protected-pdf-dialog-state';
import type { PendingPasswordImport } from './protected-pdf-import.logic';
import { useProtectedPdfImportResolution } from './protected-pdf-import-resolution.hook';
import { useProtectedPdfSkipActions } from './protected-pdf-skip-actions.hook';
import { useProtectedPdfSubmit } from './protected-pdf-submit.hook';
import { useProtectedPdfUnlock } from './protected-pdf-unlock.hook';

export function useProtectedPdfImportResolver() {
    const { record } = useDiagnostics();
    const pendingRef = useRef<PendingPasswordImport | null>(null);
    const unlockInFlightRef = useRef(false);
    const [dialog, setDialog] = useState(CLOSED_DIALOG);
    const unlockOne = useProtectedPdfUnlock(record);
    const { showCurrent, finishPending, showNextOrFinish } = useProtectedPdfDialogController({
        pendingRef,
        unlockInFlightRef,
        setDialog,
    });
    const handleSubmit = useProtectedPdfSubmit({
        dialog,
        pendingRef,
        unlockInFlightRef,
        setDialog,
        record,
        unlockOne,
        showNextOrFinish,
    });
    const { skipCurrent, skipAll } = useProtectedPdfSkipActions({
        dialog,
        pendingRef,
        unlockInFlightRef,
        record,
        showNextOrFinish,
        finishPending,
    });
    const resolveImportResult = useProtectedPdfImportResolution({
        pendingRef,
        record,
        showCurrent,
    });

    return {
        resolveImportResult,
        passwordDialog: {
            ...dialog,
            onPasswordChange: (password: string) =>
                setDialog((state) => ({ ...state, password, error: null })),
            onTryForRemainingChange: (tryForRemaining: boolean) =>
                setDialog((state) => ({ ...state, tryForRemaining })),
            onSubmit: handleSubmit,
            onSkipCurrent: skipCurrent,
            onSkipAll: skipAll,
        },
    };
}
