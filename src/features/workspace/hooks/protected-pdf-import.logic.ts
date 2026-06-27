import type { DiagnosticEntry } from '@/shared/diagnostics';
import type { PasswordProtectedFile, SourceFile } from '@/shared/domain';
import { parseAppErrorPayload } from '@/shared/errors';

export type PasswordDialogError = 'invalid-password' | 'previous-password-failed' | 'unlock-failed';

export type PendingPasswordImport = {
    baseFiles: SourceFile[];
    completedCount: number;
    queue: PasswordProtectedFile[];
    unlockedFiles: SourceFile[];
    resolve: (files: SourceFile[]) => void;
};

export type RecordDiagnostic = (entry: Omit<DiagnosticEntry, 'id' | 'timestamp'>) => void;

export type UnlockProtectedPdf = (
    file: PasswordProtectedFile,
    password: string,
) => Promise<SourceFile>;

export type PasswordSubmission = {
    pending: PendingPasswordImport;
    current: PasswordProtectedFile;
    password: string;
    tryForRemaining: boolean;
};

export function passwordDialogError(
    error: unknown,
): Exclude<PasswordDialogError, 'previous-password-failed'> {
    return parseAppErrorPayload(error)?.code === 'invalid_pdf_password'
        ? 'invalid-password'
        : 'unlock-failed';
}

export function appendUnlockedFile(pending: PendingPasswordImport, source: SourceFile) {
    pending.unlockedFiles.push(source);
    pending.completedCount += 1;
}

function recordSavedPasswordFailure(
    record: RecordDiagnostic,
    file: PasswordProtectedFile,
    error: unknown,
) {
    record({
        category: 'files',
        severity: passwordDialogError(error) === 'invalid-password' ? 'warn' : 'error',
        message: 'Saved PDF password did not unlock protected PDF',
        metadata: { name: file.name },
    });
}

export async function unlockRemainingWithPassword(
    pending: PendingPasswordImport,
    remaining: PasswordProtectedFile[],
    password: string,
    unlockOne: UnlockProtectedPdf,
    record: RecordDiagnostic,
): Promise<PasswordProtectedFile[]> {
    const stillLocked: PasswordProtectedFile[] = [];

    for (const file of remaining) {
        try {
            appendUnlockedFile(pending, await unlockOne(file, password));
        } catch (error) {
            stillLocked.push(file);
            recordSavedPasswordFailure(record, file, error);
        }
    }

    return stillLocked;
}
