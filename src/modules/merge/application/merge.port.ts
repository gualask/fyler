import { createContext, createElement, type ReactNode, useContext } from 'react';
import type { MergeRequest, MergeResult } from '../model/merge.types';

/** Merge workflow's export boundary. Native dialogs and commands stay outside the module. */
export interface MergeExportPort {
    savePDFDialog(defaultFilename: string, filterLabel: string): Promise<string>;
    mergePDFs(request: MergeRequest): Promise<MergeResult>;
}

const MergeExportPortContext = createContext<MergeExportPort | null>(null);

export function MergeExportProvider({
    value,
    children,
}: {
    value: MergeExportPort;
    children: ReactNode;
}) {
    return createElement(MergeExportPortContext.Provider, { value }, children);
}

export function useMergeExportPort(): MergeExportPort {
    const port = useContext(MergeExportPortContext);
    if (!port) {
        throw new Error('useMergeExportPort must be used within MergeExportProvider');
    }
    return port;
}
