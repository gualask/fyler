import { useCallback, useRef } from 'react';
import type { OpenFilesResult, SourceFile } from '@/shared/domain';
import type { ShowCurrentPasswordImport } from './protected-pdf-dialog-controller.hook';
import type { PendingPasswordImport, RecordDiagnostic } from './protected-pdf-import.logic';
import type { PendingPasswordImportRef } from './protected-pdf-import.refs';

export function useProtectedPdfImportResolution({
    pendingRef,
    record,
    showCurrent,
}: {
    pendingRef: PendingPasswordImportRef;
    record: RecordDiagnostic;
    showCurrent: ShowCurrentPasswordImport;
}) {
    const resolutionChainRef = useRef<Promise<unknown>>(Promise.resolve());

    const resolveNow = useCallback(
        (result: OpenFilesResult): Promise<SourceFile[]> => {
            if (result.passwordRequired.length === 0) {
                return Promise.resolve(result.files);
            }

            return new Promise((resolve) => {
                const pending: PendingPasswordImport = {
                    baseFiles: result.files,
                    completedCount: 0,
                    queue: result.passwordRequired,
                    unlockedFiles: [],
                    resolve,
                };
                pendingRef.current = pending;
                record({
                    category: 'files',
                    severity: 'info',
                    message: 'Password-protected PDFs require import resolution',
                    metadata: { count: result.passwordRequired.length },
                });
                showCurrent(pending);
            });
        },
        [pendingRef, record, showCurrent],
    );

    return useCallback(
        (result: OpenFilesResult): Promise<SourceFile[]> => {
            const run = () => resolveNow(result);
            const next = resolutionChainRef.current.then(run, run);
            resolutionChainRef.current = next.then(
                () => undefined,
                () => undefined,
            );
            return next;
        },
        [resolveNow],
    );
}
