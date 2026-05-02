type DiagnosticSeverity = 'info' | 'warn';

export function classifyAddFilesResult({
    addedCount,
    skippedCount,
}: {
    addedCount: number;
    skippedCount: number;
}): {
    diagnosticSeverity: DiagnosticSeverity;
    diagnosticMessage: string;
    metadata: { addedCount: number; skippedCount: number };
} {
    if (addedCount > 0) {
        return {
            diagnosticSeverity: 'info',
            diagnosticMessage: 'Files added to workspace',
            metadata: { addedCount, skippedCount },
        };
    }

    if (skippedCount > 0) {
        return {
            diagnosticSeverity: 'warn',
            diagnosticMessage: 'Open files completed with skipped files',
            metadata: { addedCount, skippedCount },
        };
    }

    return {
        diagnosticSeverity: 'info',
        diagnosticMessage: 'Open files dialog canceled',
        metadata: { addedCount, skippedCount },
    };
}
