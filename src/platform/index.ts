import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import type { Doc, MergeRequest } from '../domain';

export const openFilesDialog = (): Promise<Doc[]> =>
    invoke('open_files_dialog');

export const savePDFDialog = (defaultFilename: string): Promise<string> =>
    invoke('save_pdf_dialog', { defaultFilename });

export const mergePDFs = (req: MergeRequest): Promise<void> =>
    invoke('merge_pdfs', { req });

export const rotatePdfPage = (path: string, pageNum: number, angle: number): Promise<string> =>
    invoke('rotate_pdf_page', { path, pageNum, angle });

export const openDocsFromPaths = (paths: string[]): Promise<Doc[]> =>
    invoke('open_docs_from_paths', { paths });

// asset:// protocol: il webview Tauri carica il file locale direttamente
export const getPreviewUrl = (path: string): string =>
    convertFileSrc(path);
