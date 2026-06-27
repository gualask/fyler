import { useCallback, useRef, useState } from 'react';
import { usePdfCache } from '@/infra/pdf';
import { unlockPdfSource } from '@/infra/platform';
import { useDiagnostics } from '@/shared/diagnostics';
import type { OpenFilesResult, PasswordProtectedFile, SourceFile } from '@/shared/domain';
import {
    appendUnlockedFile,
    type PasswordDialogError,
    type PasswordSubmission,
    type PendingPasswordImport,
    passwordDialogError,
    unlockRemainingWithPassword,
} from './protected-pdf-import.logic';

export type ProtectedPdfPasswordDialogState = {
    open: boolean;
    file: PasswordProtectedFile | null;
    currentIndex: number;
    totalCount: number;
    password: string;
    error: PasswordDialogError | null;
    isChecking: boolean;
    tryForRemaining: boolean;
    onPasswordChange: (password: string) => void;
    onTryForRemainingChange: (value: boolean) => void;
    onSubmit: () => void;
    onSkipCurrent: () => void;
    onSkipAll: () => void;
};

const CLOSED_DIALOG: ProtectedPdfPasswordDialogState = {
    open: false,
    file: null,
    currentIndex: 0,
    totalCount: 0,
    password: '',
    error: null,
    isChecking: false,
    tryForRemaining: false,
    onPasswordChange: () => undefined,
    onTryForRemainingChange: () => undefined,
    onSubmit: () => undefined,
    onSkipCurrent: () => undefined,
    onSkipAll: () => undefined,
};

export function useProtectedPdfImportResolver() {
    const { record } = useDiagnostics();
    const { setPdfPassword } = usePdfCache();
    const pendingRef = useRef<PendingPasswordImport | null>(null);
    const unlockInFlightRef = useRef(false);
    const resolutionChainRef = useRef<Promise<unknown>>(Promise.resolve());
    const [dialog, setDialog] = useState(CLOSED_DIALOG);

    const showCurrent = useCallback(
        (
            pending: PendingPasswordImport,
            overrides: Partial<ProtectedPdfPasswordDialogState> = {},
        ) => {
            setDialog((current) => ({
                ...current,
                open: true,
                file: pending.queue[0] ?? null,
                currentIndex: pending.completedCount + 1,
                totalCount: pending.completedCount + pending.queue.length,
                password: '',
                error: null,
                isChecking: false,
                tryForRemaining: false,
                ...overrides,
            }));
        },
        [],
    );

    const finishPending = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending) return;
        pendingRef.current = null;
        unlockInFlightRef.current = false;
        setDialog(CLOSED_DIALOG);
        pending.resolve([...pending.baseFiles, ...pending.unlockedFiles]);
    }, []);

    const unlockOne = useCallback(
        async (file: PasswordProtectedFile, password: string): Promise<SourceFile> => {
            const source = await unlockPdfSource(file.originalPath, password);
            setPdfPassword(source.id, password);
            record({
                category: 'files',
                severity: 'info',
                message: 'Password-protected PDF unlocked',
                metadata: { name: file.name },
            });
            return source;
        },
        [record, setPdfPassword],
    );

    const showNextOrFinish = useCallback(
        (pending: PendingPasswordImport, error?: PasswordDialogError) => {
            if (pending.queue.length === 0) {
                finishPending();
                return;
            }

            unlockInFlightRef.current = false;
            showCurrent(pending, error ? { error } : undefined);
        },
        [finishPending, showCurrent],
    );

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
        [record],
    );

    const handleSubmit = useCallback(() => {
        const pending = pendingRef.current;
        const current = pending?.queue[0];
        const password = dialog.password;
        if (!pending || !current || !password || dialog.isChecking || unlockInFlightRef.current) {
            return;
        }

        const submission = {
            pending,
            current,
            password,
            tryForRemaining: dialog.tryForRemaining,
        };
        unlockInFlightRef.current = true;
        setDialog((state) => ({ ...state, error: null, isChecking: true }));
        void submitPassword(submission).catch((error) => {
            failCurrentUnlock(submission.current, error);
        });
    }, [
        dialog.isChecking,
        dialog.password,
        dialog.tryForRemaining,
        failCurrentUnlock,
        submitPassword,
    ]);

    const skipCurrent = useCallback(() => {
        const pending = pendingRef.current;
        const current = pending?.queue[0];
        if (!pending || !current || dialog.isChecking || unlockInFlightRef.current) return;
        record({
            category: 'files',
            severity: 'info',
            message: 'Password-protected PDF skipped during import',
            metadata: { name: current.name },
        });
        pending.completedCount += 1;
        pending.queue = pending.queue.slice(1);
        if (pending.queue.length === 0) {
            finishPending();
            return;
        }
        showCurrent(pending);
    }, [dialog.isChecking, finishPending, record, showCurrent]);

    const skipAll = useCallback(() => {
        const pending = pendingRef.current;
        if (!pending || dialog.isChecking || unlockInFlightRef.current) return;
        record({
            category: 'files',
            severity: 'info',
            message: 'Remaining password-protected PDFs skipped during import',
            metadata: { count: pending.queue.length },
        });
        pending.queue = [];
        finishPending();
    }, [dialog.isChecking, finishPending, record]);

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
        [record, showCurrent],
    );

    const resolveImportResult = useCallback(
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
