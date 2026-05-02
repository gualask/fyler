import type { DiagnosticEntry } from '../../shared/diagnostics/diagnostics.types';
import type { AppBoundaryError } from './AppErrorBoundary';

export function toReactBoundaryDiagnostic(
    error: AppBoundaryError,
): Omit<DiagnosticEntry, 'id' | 'timestamp'> {
    const componentStack = compactComponentStack(error.componentStack);
    const diagnostic = {
        category: 'app',
        severity: 'error',
        message: `React error boundary caught an error: ${error.message}`,
    } satisfies Omit<DiagnosticEntry, 'id' | 'timestamp' | 'metadata'>;

    if (!componentStack) {
        return diagnostic;
    }

    return {
        ...diagnostic,
        metadata: { componentStack },
    };
}

function compactComponentStack(componentStack: string | undefined): string | undefined {
    if (!componentStack) {
        return undefined;
    }

    const frames = componentStack
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean)
        .map((line) => line.replace(/^at\s+/, ''));

    return frames.length ? frames.join(' > ') : undefined;
}
