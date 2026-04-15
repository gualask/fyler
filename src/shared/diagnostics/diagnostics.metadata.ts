import type { DiagnosticMetadataValue } from './diagnostics.types';

export function getDiagnosticMetadataEntries(
    metadata: Record<string, DiagnosticMetadataValue> | undefined,
): Array<[string, string]> {
    if (!metadata) {
        return [];
    }

    return Object.entries(metadata).map(([key, value]) => [key, String(value)]);
}

export function formatDiagnosticMetadataInline(
    metadata: Record<string, DiagnosticMetadataValue> | undefined,
): string {
    const pairs = getDiagnosticMetadataEntries(metadata).map(([key, value]) => `${key}=${value}`);
    return pairs.length ? ` (${pairs.join(', ')})` : '';
}
