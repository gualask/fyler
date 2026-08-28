import { createContext, createElement, type ReactNode, useContext } from 'react';

import type {
    BatchCompressionRequest,
    BatchCompressionResult,
    BatchFileResult,
    PickedBatchSource,
} from '../model';

export const BATCH_FILE_COMPLETED_EVENT = 'batch-compression-file-completed';

export type BatchFileCompletedEvent = {
    version: 1;
    file: BatchFileResult;
};

export type BatchFileDragEvent =
    | { type: 'enter' | 'over' }
    | { type: 'drop'; paths: string[] }
    | { type: 'leave' };

export interface BatchCompressionPort {
    pickSources(filterLabel: string): Promise<PickedBatchSource[]>;
    inspectSources(paths: string[]): Promise<PickedBatchSource[]>;
    pickDestination(): Promise<string>;
    compress(
        request: BatchCompressionRequest,
        onFileCompleted: (file: BatchFileResult) => void,
    ): Promise<BatchCompressionResult>;
    listenForFileDrag(listener: (event: BatchFileDragEvent) => void): () => void;
}

const BatchCompressionPortContext = createContext<BatchCompressionPort | null>(null);

export function BatchCompressionProvider({
    value,
    children,
}: {
    value: BatchCompressionPort;
    children: ReactNode;
}) {
    return createElement(BatchCompressionPortContext.Provider, { value }, children);
}

export function useBatchCompressionPort(): BatchCompressionPort {
    const port = useContext(BatchCompressionPortContext);
    if (!port)
        throw new Error('useBatchCompressionPort must be used within BatchCompressionProvider');
    return port;
}
