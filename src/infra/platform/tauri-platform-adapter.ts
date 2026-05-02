import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { PlatformAdapter } from './platform-adapter.ts';

export const tauriPlatformAdapter: PlatformAdapter = {
    openFilesDialog: (filterLabel) => invoke('open_files_dialog', { filterLabel }),
    savePDFDialog: (defaultFilename, filterLabel) =>
        invoke('save_pdf_dialog', { defaultFilename, filterLabel }),
    saveTextFile: (defaultFilename, filterLabel, content) =>
        invoke('save_text_file', { defaultFilename, filterLabel, content }),
    mergePDFs: (req) => invoke('merge_pdfs', { req }),
    getAppMetadata: () => invoke('get_app_metadata'),
    openExternalUrl: (url) => invoke('open_external_url', { url }),
    openFilesFromPaths: (paths) => invoke('open_files_from_paths', { paths }),
    releaseSources: (fileIds) => invoke('release_sources', { fileIds }),
    getImageExportPreviewLayout: (path, imageFit, quarterTurns) =>
        invoke('get_image_export_preview_layout', { path, imageFit, quarterTurns }),
    getPreviewUrl: (path) => convertFileSrc(path),
    windowGetLogicalSize: async () => {
        const win = getCurrentWindow();
        const physical = await win.innerSize();
        const scale = await win.scaleFactor();
        return physical.toLogical(scale);
    },
    windowSetSize: async (w, h) => getCurrentWindow().setSize(new LogicalSize(w, h)),
    windowSetAlwaysOnTop: async (flag) => getCurrentWindow().setAlwaysOnTop(flag),
    windowSetMinSize: async (w, h) => getCurrentWindow().setMinSize(new LogicalSize(w, h)),
    windowSetMaxSize: async (size) =>
        getCurrentWindow().setMaxSize(size ? new LogicalSize(size.width, size.height) : null),
    windowSetMaximizable: async (flag) => getCurrentWindow().setMaximizable(flag),
};
