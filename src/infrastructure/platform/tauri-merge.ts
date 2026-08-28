import { invoke } from '@tauri-apps/api/core';

import type { MergeExportPort } from '@/modules/merge/application/merge.port';

/** Native merge command and output-dialog adapter. */
export const tauriMergeExport: MergeExportPort = {
    savePDFDialog: (defaultFilename, filterLabel) =>
        invoke('save_pdf_dialog', { defaultFilename, filterLabel }),
    mergePDFs: (request) => invoke('merge_pdfs', { req: request }),
};
