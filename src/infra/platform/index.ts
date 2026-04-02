import { convertFileSrc, invoke } from '@tauri-apps/api/core';
import { getCurrentWindow, LogicalSize } from '@tauri-apps/api/window';
import type { AppMetadata } from '@/shared/diagnostics';
import type {
    ImageExportPreviewLayout,
    ImageFit,
    MergeRequest,
    MergeResult,
    OpenFilesResult,
    QuarterTurn,
} from '@/shared/domain';

/**
 * Typed wrapper around the app's native (Tauri) API surface.
 *
 * Keep all `invoke(...)` calls centralized here to make the boundary explicit.
 */
export const openFilesDialog = (filterLabel: string): Promise<OpenFilesResult> =>
    invoke('open_files_dialog', { filterLabel });

export const savePDFDialog = (defaultFilename: string, filterLabel: string): Promise<string> =>
    invoke('save_pdf_dialog', { defaultFilename, filterLabel });

export const mergePDFs = (req: MergeRequest): Promise<MergeResult> => invoke('merge_pdfs', { req });

export const getAppMetadata = (): Promise<AppMetadata> => invoke('get_app_metadata');

export const openExternalUrl = (url: string): Promise<void> => invoke('open_external_url', { url });

export const openFilesFromPaths = (paths: string[]): Promise<OpenFilesResult> =>
    invoke('open_files_from_paths', { paths });

export const releaseSources = (fileIds: string[]): Promise<void> =>
    invoke('release_sources', { fileIds });

export const getImageExportPreviewLayout = (
    path: string,
    imageFit: ImageFit,
    quarterTurns: QuarterTurn,
): Promise<ImageExportPreviewLayout> =>
    invoke('get_image_export_preview_layout', { path, imageFit, quarterTurns });

/** Converts a local filesystem path into a URL that the Tauri webview can load. */
export const getPreviewUrl = (path: string): string => convertFileSrc(path);

export const windowGetLogicalSize = async () => {
    const win = getCurrentWindow();
    const physical = await win.innerSize();
    const scale = await win.scaleFactor();
    return physical.toLogical(scale);
};

export const windowSetSize = (w: number, h: number) =>
    getCurrentWindow().setSize(new LogicalSize(w, h));

export const windowSetAlwaysOnTop = (flag: boolean) => getCurrentWindow().setAlwaysOnTop(flag);
