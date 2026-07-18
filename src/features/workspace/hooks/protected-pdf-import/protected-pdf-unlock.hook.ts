import { useCallback } from 'react';
import { usePdfCache } from '@/infra/pdf';
import { unlockPdfSource } from '@/infra/platform';
import type { PasswordProtectedFile, SourceFile } from '@/shared/domain';
import type { RecordDiagnostic } from './protected-pdf-import.logic';

export function useProtectedPdfUnlock(record: RecordDiagnostic) {
    const { setPdfPassword } = usePdfCache();

    return useCallback(
        async (file: PasswordProtectedFile, password: string): Promise<SourceFile> => {
            const source = await unlockPdfSource(file.originalPath, password);
            setPdfPassword(source.id, password);
            record({
                category: 'files',
                severity: 'info',
                message: 'Password-protected PDF unlocked',
            });
            return source;
        },
        [record, setPdfPassword],
    );
}
