import { useCallback } from 'react';
import type { PasswordProtectedFile, SourceFile } from '@/capabilities/document-sources';
import { useDocumentSourcesPort } from '@/capabilities/document-sources/source.port';
import { usePdfCache } from '@/infrastructure/pdfjs';
import type { RecordDiagnostic } from './protected-pdf-import.logic';

export function useProtectedPdfUnlock(record: RecordDiagnostic) {
    const { setPdfPassword } = usePdfCache();
    const documentSources = useDocumentSourcesPort();

    return useCallback(
        async (file: PasswordProtectedFile, password: string): Promise<SourceFile> => {
            const source = await documentSources.unlockPdfSource(file.originalPath, password);
            setPdfPassword(source.id, password);
            record({
                category: 'files',
                severity: 'info',
                message: 'Password-protected PDF unlocked',
            });
            return source;
        },
        [documentSources, record, setPdfPassword],
    );
}
