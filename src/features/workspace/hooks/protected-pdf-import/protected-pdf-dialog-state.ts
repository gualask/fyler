import type { PasswordProtectedFile } from '@/shared/domain';
import type { PasswordDialogError, PendingPasswordImport } from './protected-pdf-import.logic';

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

export type ProtectedPdfPasswordDialogData = Omit<
    ProtectedPdfPasswordDialogState,
    'onPasswordChange' | 'onTryForRemainingChange' | 'onSubmit' | 'onSkipCurrent' | 'onSkipAll'
>;

export const CLOSED_DIALOG: ProtectedPdfPasswordDialogData = {
    open: false,
    file: null,
    currentIndex: 0,
    totalCount: 0,
    password: '',
    error: null,
    isChecking: false,
    tryForRemaining: false,
};

export function openedDialog(
    current: ProtectedPdfPasswordDialogData,
    pending: PendingPasswordImport,
    overrides: Partial<ProtectedPdfPasswordDialogData> = {},
): ProtectedPdfPasswordDialogData {
    return {
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
    };
}
