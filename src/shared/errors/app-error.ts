export function getErrorMessage(value: unknown): string {
    if (value instanceof Error) return value.message;
    if (
        value &&
        typeof value === 'object' &&
        'message' in value &&
        typeof (value as { message?: unknown }).message === 'string'
    ) {
        return (value as { message: string }).message;
    }
    return String(value);
}

export type AppErrorPayload = {
    code: string;
    message?: string;
    meta?: Record<string, unknown>;
};

export function toInterpolationValues(
    meta: Record<string, unknown> | undefined,
): Record<string, string | number> | undefined {
    if (!meta) return undefined;
    const out: Record<string, string | number> = {};
    for (const [key, value] of Object.entries(meta)) {
        if (typeof value === 'string' || typeof value === 'number') {
            out[key] = value;
        }
    }
    return out;
}

function parseAppErrorObject(value: unknown): AppErrorPayload | null {
    if (!value || typeof value !== 'object') return null;
    const maybe = value as { code?: unknown; message?: unknown; meta?: unknown };
    if (typeof maybe.code !== 'string') return null;
    return {
        code: maybe.code,
        message: typeof maybe.message === 'string' ? maybe.message : undefined,
        meta:
            maybe.meta && typeof maybe.meta === 'object'
                ? (maybe.meta as Record<string, unknown>)
                : undefined,
    };
}

export function parseAppErrorPayload(error: unknown): AppErrorPayload | null {
    if (!error) return null;

    if (error instanceof Error) {
        return parseAppErrorPayload(error.message);
    }

    const objectPayload = parseAppErrorObject(error);
    if (objectPayload) return objectPayload;

    if (typeof error === 'string') {
        try {
            const parsed = JSON.parse(error) as unknown;
            return parseAppErrorPayload(parsed);
        } catch {
            return null;
        }
    }

    const messagePayload = parseAppErrorPayload(getErrorMessage(error));
    return messagePayload;
}
