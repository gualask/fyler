import { createContext, createElement, type ReactNode, useContext } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import type {
    CompositionPreviewLayout,
    PageCompositionExportRequest,
    PageCompositionResult,
    PreviewLayoutRequest,
} from '../model';

export interface PageCompositionPort {
    registerPdfPageRaster(jpegBytes: Uint8Array): Promise<SourceFile>;
    getPreviewLayout(request: PreviewLayoutRequest): Promise<CompositionPreviewLayout>;
    selectOutput(
        defaultFilename: string,
        filterLabel: string,
        extension: 'pdf' | 'jpg',
    ): Promise<string>;
    exportComposition(request: PageCompositionExportRequest): Promise<PageCompositionResult>;
}

export interface PageCompositionNotifications {
    isBusy: boolean;
    beginOpeningFiles(): boolean;
    finishOpeningFiles(): void;
    beginPageComposition(): boolean;
    finishPageComposition(): void;
    showExportCompleted(): void;
    showError(error: unknown): void;
}

const PageCompositionPortContext = createContext<PageCompositionPort | null>(null);

export function PageCompositionProvider({
    value,
    children,
}: {
    value: PageCompositionPort;
    children: ReactNode;
}) {
    return createElement(PageCompositionPortContext.Provider, { value }, children);
}

export function usePageCompositionPort(): PageCompositionPort {
    const port = useContext(PageCompositionPortContext);
    if (!port) {
        throw new Error('usePageCompositionPort must be used within PageCompositionProvider');
    }
    return port;
}
