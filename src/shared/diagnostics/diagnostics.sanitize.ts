import { getErrorMessage } from '@/shared/errors';
import type { DiagnosticMetadataValue } from './diagnostics.types';

const QUOTED_FILE_URL_PATTERN = /(["'`])file:\/\/\/[^"'`\r\n]*\1/gi;
const QUOTED_UNIX_PATH_PATTERN = /(["'`])\/[^"'`\r\n]*\1/g;
const QUOTED_WINDOWS_PATH_PATTERN = /(["'`])(?:[A-Za-z]:\\|\\\\(?:[?.]\\)?)[^"'`\r\n]*\1/g;
// Raw spaces make unquoted file URLs and UNC paths intrinsically ambiguous. Consume the rest of
// the diagnostic line so privacy wins over preserving any trailing prose.
const FILE_URL_PATTERN = /file:\/\/\/[^"'`\r\n]+/gi;
const WINDOWS_UNC_PATH_PATTERN = /(^|[\s("'`])\\\\(?:[?.]\\)?[^\r\n"'`]+/g;
const UNIX_PATH_PATTERN = /(^|[\s("'`])\/(?:[^/\s"'`]+\/)*[^/\s"'`]+/g;
const WINDOWS_PATH_PATTERN = /(^|[\s("'`])[A-Za-z]:\\(?:[^\\\s"'`]+\\)*[^\\\s"'`]+/g;

function isSensitiveMetadataKey(key: string): boolean {
    const normalized = key.replaceAll(/[-_\s]/g, '').toLowerCase();
    return normalized === 'name' || normalized.endsWith('path') || normalized.endsWith('filename');
}

export function sanitizeText(value: string): string {
    return value
        .replace(QUOTED_FILE_URL_PATTERN, (_match, quote: string) => `${quote}<path>${quote}`)
        .replace(QUOTED_UNIX_PATH_PATTERN, (_match, quote: string) => `${quote}<path>${quote}`)
        .replace(QUOTED_WINDOWS_PATH_PATTERN, (_match, quote: string) => `${quote}<path>${quote}`)
        .replace(FILE_URL_PATTERN, '<path>')
        .replace(WINDOWS_UNC_PATH_PATTERN, (_match, prefix: string) => `${prefix}<path>`)
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
            isSensitiveMetadataKey(key)
                ? '<redacted>'
                : typeof value === 'string'
                  ? sanitizeText(value)
                  : value,
        ]),
    );

    return Object.keys(sanitized).length ? sanitized : undefined;
}

export function toDiagnosticMessage(error: unknown): string {
    return sanitizeText(getErrorMessage(error));
}
