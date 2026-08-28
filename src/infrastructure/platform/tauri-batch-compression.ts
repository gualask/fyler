import { invoke } from '@tauri-apps/api/core';
import { type DragDropEvent, getCurrentWebview } from '@tauri-apps/api/webview';
import type {
    BatchCompressionPort,
    BatchFileDragEvent,
} from '@/modules/batch-compression/application';
import {
    BATCH_FILE_COMPLETED_EVENT,
    type BatchFileCompletedEvent,
} from '@/modules/batch-compression/application';
import type {
    BatchCompressionRequest,
    BatchCompressionResult,
    PickedBatchSource,
} from '@/modules/batch-compression/model';
import { listenToTauriEvent } from './events';

function toBatchDragEvent(event: DragDropEvent): BatchFileDragEvent {
    if (event.type === 'drop') return { type: 'drop', paths: event.paths };
    return { type: event.type };
}

function listenForFileDrag(listener: (event: BatchFileDragEvent) => void): () => void {
    let disposed = false;
    let unlisten: (() => void) | undefined;
    void getCurrentWebview()
        .onDragDropEvent(({ payload }) => listener(toBatchDragEvent(payload)))
        .then((dispose) => {
            if (disposed) dispose();
            else unlisten = dispose;
        })
        .catch(() => undefined);
    return () => {
        disposed = true;
        unlisten?.();
    };
}

export const tauriBatchCompression: BatchCompressionPort = {
    pickSources: (filterLabel) =>
        invoke<PickedBatchSource[]>('pick_batch_compression_sources', { filterLabel }),
    inspectSources: (paths) =>
        invoke<PickedBatchSource[]>('inspect_batch_compression_sources', { paths }),
    pickDestination: () => invoke<string>('pick_batch_compression_destination'),
    compress: async (request: BatchCompressionRequest, onFileCompleted) => {
        const sourceIds = new Set(request.files.map((file) => file.sourceId));
        const dispose = await listenToTauriEvent<BatchFileCompletedEvent>(
            BATCH_FILE_COMPLETED_EVENT,
            ({ payload }) => {
                if (payload.version === 1 && sourceIds.has(payload.file.sourceId)) {
                    onFileCompleted(payload.file);
                }
            },
        );
        try {
            return await invoke<BatchCompressionResult>('compress_batch', { req: request });
        } finally {
            dispose();
        }
    },
    listenForFileDrag,
};
