import { useCallback } from 'react';
import type {
    FinishPendingPasswordImport,
    ShowNextPasswordImportOrFinish,
} from './protected-pdf-dialog-controller.hook';
import type { ProtectedPdfPasswordDialogData } from './protected-pdf-dialog-state';
import {
    currentPasswordImport,
    type RecordDiagnostic,
    skipCurrentPasswordFile,
} from './protected-pdf-import.logic';
import type { PendingPasswordImportRef, UnlockInFlightRef } from './protected-pdf-import.refs';

export function useProtectedPdfSkipActions({
    dialog,
    pendingRef,
    unlockInFlightRef,
    record,
    showNextOrFinish,
    finishPending,
}: {
    dialog: ProtectedPdfPasswordDialogData;
    pendingRef: PendingPasswordImportRef;
    unlockInFlightRef: UnlockInFlightRef;
    record: RecordDiagnostic;
    showNextOrFinish: ShowNextPasswordImportOrFinish;
    finishPending: FinishPendingPasswordImport;
}) {
    const { isChecking } = dialog;

    const skipCurrent = useCallback(() => {
        const activeImport = currentPasswordImport(pendingRef.current);
        if (!activeImport || isChecking || unlockInFlightRef.current) return;

        record({
            category: 'files',
            severity: 'info',
            message: 'Password-protected PDF skipped during import',
            metadata: { name: activeImport.current.name },
        });
        skipCurrentPasswordFile(activeImport.pending);
        showNextOrFinish(activeImport.pending);
    }, [isChecking, pendingRef, record, showNextOrFinish, unlockInFlightRef]);

    const skipAll = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending || isChecking || unlockInFlightRef.current) return;
        record({
            category: 'files',
            severity: 'info',
            message: 'Remaining password-protected PDFs skipped during import',
            metadata: { count: pending.queue.length },
        });
        pending.queue = [];
        finishPending();
    }, [finishPending, isChecking, pendingRef, record, unlockInFlightRef]);

    return {
        skipCurrent,
        skipAll,
    };
}
