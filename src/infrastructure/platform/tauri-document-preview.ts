import { convertFileSrc, invoke } from '@tauri-apps/api/core';

import type {
    DocumentPreviewPort,
    ImagePreviewBytes,
} from '@/capabilities/document-preview/preview.types';

/** Native source URL, image-preview, and export-geometry adapter. */
export const tauriDocumentPreview: DocumentPreviewPort = {
    getImageExportPreviewLayout: (fileId, imageFit, quarterTurns) =>
        invoke('get_image_export_preview_layout', { fileId, imageFit, quarterTurns }),
    getImagePreview: ({ fileId, originalPath, maxSide }) =>
        invoke<ImagePreviewBytes>('get_image_preview', { fileId, originalPath, maxSide }),
    getSourceUrl: (path) => convertFileSrc(path),
};
