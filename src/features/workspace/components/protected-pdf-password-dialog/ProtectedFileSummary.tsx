import { IconFileTypePdf } from '@tabler/icons-react';

import type { ProtectedPdfPasswordDialogState } from '../../hooks/protected-pdf-import.hook';

type ProtectedPdfFile = NonNullable<ProtectedPdfPasswordDialogState['file']>;

function formatBytes(byteSize: number): string {
    if (!Number.isFinite(byteSize) || byteSize <= 0) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let value = byteSize;
    let unitIndex = 0;
    while (value >= 1024 && unitIndex < units.length - 1) {
        value /= 1024;
        unitIndex += 1;
    }
    const digits = value >= 10 || unitIndex === 0 ? 0 : 1;
    return `${value.toFixed(digits)} ${units[unitIndex]}`;
}

export function ProtectedFileSummary({ file }: { file: ProtectedPdfFile }) {
    return (
        <div className="flex min-w-0 items-center gap-3 rounded-xl border border-ui-border bg-ui-bg/60 p-3">
            <IconFileTypePdf className="h-5 w-5 shrink-0 text-ui-kind-pdf" />
            <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ui-text">{file.name}</p>
                <p className="mt-0.5 text-xs text-ui-text-muted">{formatBytes(file.byteSize)}</p>
            </div>
        </div>
    );
}
