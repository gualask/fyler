export type MergeProgressPhase =
    | 'preparing-documents'
    | 'merging-pages'
    | 'optimizing-images'
    | 'saving';

export type PageCompositionProgressPhase = 'validating' | 'composing' | 'saving';

export const OPERATION_PROGRESS_EVENT = 'operation-progress';
export const OPERATION_PROGRESS_VERSION = 1 as const;

/** Versioned progress contract shared by workflow operation transports. */
export type OperationProgressPayload = {
    version: typeof OPERATION_PROGRESS_VERSION;
    operation: 'merge' | 'page-composition';
    phase: string;
    percentage: number;
};

export function isOperationProgressPayload(value: unknown): value is OperationProgressPayload {
    if (typeof value !== 'object' || value === null) return false;

    const payload = value as Record<string, unknown>;
    return (
        payload.version === OPERATION_PROGRESS_VERSION &&
        (payload.operation === 'merge' || payload.operation === 'page-composition') &&
        typeof payload.phase === 'string' &&
        typeof payload.percentage === 'number' &&
        Number.isInteger(payload.percentage) &&
        payload.percentage >= 0 &&
        payload.percentage <= 100
    );
}

export type MergeOperationProgressPayload = OperationProgressPayload & {
    operation: 'merge';
    phase: MergeProgressPhase;
};

export function isMergeOperationProgressPayload(
    value: unknown,
): value is MergeOperationProgressPayload {
    if (!isOperationProgressPayload(value) || value.operation !== 'merge') return false;

    return (
        value.phase === 'preparing-documents' ||
        value.phase === 'merging-pages' ||
        value.phase === 'optimizing-images' ||
        value.phase === 'saving'
    );
}

export type PageCompositionOperationProgressPayload = OperationProgressPayload & {
    operation: 'page-composition';
    phase: PageCompositionProgressPhase;
};

export function isPageCompositionOperationProgressPayload(
    value: unknown,
): value is PageCompositionOperationProgressPayload {
    if (!isOperationProgressPayload(value) || value.operation !== 'page-composition') return false;
    return value.phase === 'validating' || value.phase === 'composing' || value.phase === 'saving';
}
