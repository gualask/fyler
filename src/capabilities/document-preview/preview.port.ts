import { createContext, createElement, type ReactNode, useContext } from 'react';
import type { DocumentPreviewPort } from './preview.types';

const DocumentPreviewPortContext = createContext<DocumentPreviewPort | null>(null);

export function DocumentPreviewProvider({
    value,
    children,
}: {
    value: DocumentPreviewPort;
    children: ReactNode;
}) {
    return createElement(DocumentPreviewPortContext.Provider, { value }, children);
}

export function useDocumentPreviewPort(): DocumentPreviewPort {
    const port = useContext(DocumentPreviewPortContext);
    if (!port) {
        throw new Error('useDocumentPreviewPort must be used within DocumentPreviewProvider');
    }
    return port;
}
