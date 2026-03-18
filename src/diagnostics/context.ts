import { createContext } from 'react';

import type { DiagnosticEntry } from './types';

export interface DiagnosticsContextValue {
    entries: DiagnosticEntry[];
    record: (entry: Omit<DiagnosticEntry, 'id' | 'timestamp'>) => void;
}

export const DiagnosticsContext = createContext<DiagnosticsContextValue | null>(null);
