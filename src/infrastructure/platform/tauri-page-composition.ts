import { invoke } from '@tauri-apps/api/core';
import type { PageCompositionPort } from '@/modules/page-composition/application';

export const tauriPageComposition: PageCompositionPort = {
    registerPdfPageRaster: (jpegBytes) => invoke('register_pdf_page_raster', jpegBytes),
    getPreviewLayout: (req) => invoke('get_page_composition_preview_layout', { req }),
    selectOutput: (defaultFilename, filterLabel, extension) =>
        invoke('save_export_dialog', { defaultFilename, filterLabel, extension }),
    exportComposition: (req) => invoke('export_page_composition', { req }),
};
