import {
    useCallback,
    useMemo,
    useState,
    type ReactNode,
} from 'react';

import { DiagnosticsContext, type DiagnosticsContextValue } from './diagnostics.context';
import { sanitizeMetadata, sanitizeText } from './diagnostics.sanitize';
import type { DiagnosticEntry } from './diagnostics.types';
const MAX_ENTRIES = 50;

export function DiagnosticsProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<DiagnosticEntry[]>([]);

    const record = useCallback((entry: Omit<DiagnosticEntry, 'id' | 'timestamp'>) => {
        const nextEntry: DiagnosticEntry = {
            ...entry,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            message: sanitizeText(entry.message),
            metadata: sanitizeMetadata(entry.metadata),
        };

        setEntries((current) => [...current, nextEntry].slice(-MAX_ENTRIES));
    }, []);

    const value = useMemo<DiagnosticsContextValue>(() => ({
        entries,
        record,
    }), [entries, record]);

    return (
        <DiagnosticsContext.Provider value={value}>
            {children}
        </DiagnosticsContext.Provider>
    );
}
