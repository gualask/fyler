import { invoke } from '@tauri-apps/api/core';
import { type DragDropEvent, getCurrentWebview } from '@tauri-apps/api/webview';

import type {
    DocumentSourcesPort,
    FileDragEvent,
    FileDragPosition,
} from '@/capabilities/document-sources/source.port';

function cssPosition(position: FileDragPosition): FileDragPosition {
    // Wry reports Cocoa/GTK drag coordinates in logical points, while WebView2 reports
    // physical client coordinates. DOM hit-testing always expects CSS pixels.
    const scale = navigator.userAgent.includes('Windows') ? window.devicePixelRatio || 1 : 1;
    return { x: position.x / scale, y: position.y / scale };
}

function forwardFileDragEvent(
    listener: (event: FileDragEvent) => void,
    event: DragDropEvent,
): void {
    if (event.type === 'leave') {
        listener(event);
        return;
    }

    const position = cssPosition(event.position);
    if (event.type === 'drop') {
        listener({ type: 'drop', paths: event.paths, position });
        return;
    }

    listener({ type: event.type, position });
}

function listenForFileDrag(listener: (event: FileDragEvent) => void): () => void {
    let disposed = false;
    let unlisten: (() => void) | undefined;

    const currentWebview = getCurrentWebview();
    void currentWebview
        .onDragDropEvent(({ payload }) => forwardFileDragEvent(listener, payload))
        .then((dispose) => {
            if (disposed) dispose();
            else unlisten = dispose;
        })
        .catch(() => {
            // Keep registration failures isolated from the active UI flow.
        });

    return () => {
        disposed = true;
        unlisten?.();
    };
}

/** Native source import/lifecycle adapter. Command names are versioned contracts. */
export const tauriDocumentSources: DocumentSourcesPort = {
    openFilesDialog: (filterLabel) => invoke('open_files_dialog', { filterLabel }),
    openFilesFromPaths: (paths) => invoke('open_files_from_paths', { paths }),
    unlockPdfSource: (path, password) => invoke('unlock_pdf_source', { path, password }),
    discardPendingSources: (paths) => invoke('discard_pending_sources', { paths }),
    releaseSources: (fileIds) => invoke('release_sources', { fileIds }),
    listenForFileDrag,
};
