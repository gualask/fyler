import { type ReactNode, useCallback, useMemo, useRef, useState } from 'react';

import { DiagnosticsContext, type DiagnosticsContextValue } from './diagnostics.context';
import { sanitizeMetadata, sanitizeText } from './diagnostics.sanitize';
import type { DiagnosticEntry } from './diagnostics.types';

const MAX_ENTRIES = 50;
const DEV_DUPLICATE_WINDOW_MS = 60;

/** Stores diagnostic entries in memory and exposes a `record()` function via context. */
export function DiagnosticsProvider({ children }: { children: ReactNode }) {
    const [entries, setEntries] = useState<DiagnosticEntry[]>([]);
    const lastRecordedRef = useRef<{ signature: string; atMs: number } | null>(null);

    const record = useCallback((entry: Omit<DiagnosticEntry, 'id' | 'timestamp'>) => {
        const nextEntry: DiagnosticEntry = {
            ...entry,
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: new Date().toISOString(),
            message: sanitizeText(entry.message),
            metadata: sanitizeMetadata(entry.metadata),
        };

        // DEV-only: mitigate React.StrictMode double-mount behavior.
        //
        // In development, StrictMode intentionally mounts/unmounts and re-mounts components to help
        // surface unsafe side effects. This can cause `useEffect(..., [])` code to run twice and
        // emit back-to-back duplicate diagnostics (e.g. "App session started").
        //
        // To keep the diagnostics view readable for developers, we drop immediate duplicates within
        // a tiny time window. This is an intentionally conservative heuristic and is disabled in
        // production builds.
        if (import.meta.env.DEV) {
            const metaSignature = nextEntry.metadata
                ? (() => {
                      try {
                          return JSON.stringify(nextEntry.metadata);
                      } catch {
                          return '[unserializable-metadata]';
                      }
                  })()
                : '';
            const signature = `${nextEntry.category}|${nextEntry.severity}|${nextEntry.message}|${metaSignature}`;
            const nowMs = Date.now();
            const last = lastRecordedRef.current;
            if (
                last &&
                last.signature === signature &&
                nowMs - last.atMs <= DEV_DUPLICATE_WINDOW_MS
            ) {
                return;
            }
            lastRecordedRef.current = { signature, atMs: nowMs };
        }

        setEntries((current) => [...current, nextEntry].slice(-MAX_ENTRIES));
    }, []);

    const value = useMemo<DiagnosticsContextValue>(
        () => ({
            entries,
            record,
        }),
        [entries, record],
    );

    return <DiagnosticsContext.Provider value={value}>{children}</DiagnosticsContext.Provider>;
}
