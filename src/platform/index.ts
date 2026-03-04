import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import type { Doc, MergeRequest } from '../domain';

export const openPDFsDialog = (): Promise<Doc[]> =>
    invoke('open_pdfs_dialog');

export const savePDFDialog = (defaultFilename: string): Promise<string> =>
    invoke('save_pdf_dialog', { defaultFilename });

export const mergePDFs = (req: MergeRequest): Promise<void> =>
    invoke('merge_pdfs', { req });

// asset:// protocol: il webview Tauri carica il file locale direttamente
export const getPDFPreviewUrl = (path: string): string =>
    convertFileSrc(path);
