import { createContext, createElement, type ReactNode, useContext } from 'react';
import type { OpenFilesResult, SourceFile } from './source.types';

export type FileDragPosition = { x: number; y: number };

export type FileDragEvent =
    | { type: 'enter' | 'over'; position: FileDragPosition }
    | { type: 'drop'; paths: string[]; position: FileDragPosition }
    | { type: 'leave' };

/**
 * Consumer-owned source lifecycle boundary.
 *
 * The capability describes source operations without exposing the native
 * command transport to workflows. Runtime implementations are installed by
 * the application composition root.
 */
export interface DocumentSourcesPort {
    openFilesDialog(filterLabel: string): Promise<OpenFilesResult>;
    openFilesFromPaths(paths: string[]): Promise<OpenFilesResult>;
    unlockPdfSource(path: string, password: string): Promise<SourceFile>;
    discardPendingSources(paths: string[]): Promise<void>;
    releaseSources(fileIds: string[]): Promise<void>;
    listenForFileDrag(listener: (event: FileDragEvent) => void): () => void;
}

const DocumentSourcesPortContext = createContext<DocumentSourcesPort | null>(null);

export function DocumentSourcesProvider({
    value,
    children,
}: {
    value: DocumentSourcesPort;
    children: ReactNode;
}) {
    return createElement(DocumentSourcesPortContext.Provider, { value }, children);
}

export function useDocumentSourcesPort(): DocumentSourcesPort {
    const port = useContext(DocumentSourcesPortContext);
    if (!port) {
        throw new Error('useDocumentSourcesPort must be used within DocumentSourcesProvider');
    }
    return port;
}
