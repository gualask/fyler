import type { DiagnosticMetadataValue } from './types';
import { getErrorMessage } from '@/errors';

const UNIX_PATH_PATTERN = /(^|[\s("'`])\/(?:[^/\s"'`]+\/)*[^/\s"'`]+/g;
const WINDOWS_PATH_PATTERN = /(^|[\s("'`])[A-Za-z]:\\(?:[^\\\s"'`]+\\)*[^\\\s"'`]+/g;

export function sanitizeText(value: string): string {
    return value
        .replace(UNIX_PATH_PATTERN, (_match, prefix: string) => `${prefix}<path>`)
        .replace(WINDOWS_PATH_PATTERN, (_match, prefix: string) => `${prefix}<path>`);
}

export function sanitizeMetadata(
    metadata: Record<string, DiagnosticMetadataValue> | undefined,
): Record<string, DiagnosticMetadataValue> | undefined {
    if (!metadata) return undefined;

    const sanitized = Object.fromEntries(
        Object.entries(metadata).map(([key, value]) => [
            key,
            typeof value === 'string' ? sanitizeText(value) : value,
        ]),
    );

    return Object.keys(sanitized).length ? sanitized : undefined;
}

export function toDiagnosticMessage(error: unknown): string {
    return sanitizeText(getErrorMessage(error));
}
