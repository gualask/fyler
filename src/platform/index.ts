import { invoke, convertFileSrc } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { SourceFile, MergeRequest } from '../domain';

export const openFilesDialog = (): Promise<SourceFile[]> =>
    invoke('open_files_dialog');

export const savePDFDialog = (defaultFilename: string): Promise<string> =>
    invoke('save_pdf_dialog', { defaultFilename });

export const mergePDFs = (req: MergeRequest): Promise<void> =>
    invoke('merge_pdfs', { req });

export const openFilesFromPaths = (paths: string[]): Promise<SourceFile[]> =>
    invoke('open_files_from_paths', { paths });

export const releaseSources = (fileIds: string[]): Promise<void> =>
    invoke('release_sources', { fileIds });

// asset:// protocol: il webview Tauri carica il file locale direttamente
export const getPreviewUrl = (path: string): string =>
    convertFileSrc(path);

export const windowGetLogicalSize = async () => {
    const win = getCurrentWindow();
    const physical = await win.innerSize();
    const scale = await win.scaleFactor();
    return physical.toLogical(scale);
};

export const windowSetSize = (w: number, h: number) =>
    getCurrentWindow().setSize(new LogicalSize(w, h));

export const windowSetAlwaysOnTop = (flag: boolean) =>
    getCurrentWindow().setAlwaysOnTop(flag);
