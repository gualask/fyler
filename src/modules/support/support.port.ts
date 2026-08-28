import { createContext, createElement, type ReactNode, useContext } from 'react';
import type { AppMetadata } from '@/shared/diagnostics';

/** Support's external-runtime boundary (metadata, diagnostics file, browser handoff). */
export interface SupportPort {
    getAppMetadata(): Promise<AppMetadata>;
    saveTextFile(defaultFilename: string, filterLabel: string, content: string): Promise<string>;
    openExternalUrl(url: string): Promise<void>;
}

const SupportPortContext = createContext<SupportPort | null>(null);

export function SupportProvider({ value, children }: { value: SupportPort; children: ReactNode }) {
    return createElement(SupportPortContext.Provider, { value }, children);
}

export function useSupportPort(): SupportPort {
    const port = useContext(SupportPortContext);
    if (!port) {
        throw new Error('useSupportPort must be used within SupportProvider');
    }
    return port;
}
