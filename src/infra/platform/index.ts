import type { PlatformAdapter } from './platform-adapter.ts';
import { tauriPlatformAdapter } from './tauri-platform-adapter.ts';

/**
 * Delegating wrapper around the app's platform surface.
 *
 * Keep all direct native calls centralized in `src/infra/platform/*`.
 */
let currentPlatformAdapter: PlatformAdapter = tauriPlatformAdapter;

export function setPlatformAdapter(adapter: PlatformAdapter): void {
    currentPlatformAdapter = adapter;
}

export function resetPlatformAdapter(): void {
    currentPlatformAdapter = tauriPlatformAdapter;
}

export const openFilesDialog = (filterLabel: string) =>
    currentPlatformAdapter.openFilesDialog(filterLabel);

export const savePDFDialog = (defaultFilename: string, filterLabel: string) =>
    currentPlatformAdapter.savePDFDialog(defaultFilename, filterLabel);

export const saveTextFile = (defaultFilename: string, filterLabel: string, content: string) =>
    currentPlatformAdapter.saveTextFile(defaultFilename, filterLabel, content);

export const mergePDFs = (req: Parameters<PlatformAdapter['mergePDFs']>[0]) =>
    currentPlatformAdapter.mergePDFs(req);

export const getAppMetadata = () => currentPlatformAdapter.getAppMetadata();

export const openExternalUrl = (url: string) => currentPlatformAdapter.openExternalUrl(url);

export const openFilesFromPaths = (paths: string[]) =>
    currentPlatformAdapter.openFilesFromPaths(paths);

export const releaseSources = (fileIds: string[]) => currentPlatformAdapter.releaseSources(fileIds);

export const getImageExportPreviewLayout = (
    path: string,
    imageFit: Parameters<PlatformAdapter['getImageExportPreviewLayout']>[1],
    quarterTurns: Parameters<PlatformAdapter['getImageExportPreviewLayout']>[2],
) => currentPlatformAdapter.getImageExportPreviewLayout(path, imageFit, quarterTurns);

export const getPreviewUrl = (path: string) => currentPlatformAdapter.getPreviewUrl(path);

export const windowGetLogicalSize = () => currentPlatformAdapter.windowGetLogicalSize();

export const windowSetSize = (w: number, h: number) => currentPlatformAdapter.windowSetSize(w, h);

export const windowSetAlwaysOnTop = (flag: boolean) =>
    currentPlatformAdapter.windowSetAlwaysOnTop(flag);

export const windowSetMinSize = (w: number, h: number) =>
    currentPlatformAdapter.windowSetMinSize(w, h);

export const windowSetMaxSize = (size: { width: number; height: number } | null) =>
    currentPlatformAdapter.windowSetMaxSize(size);

export const windowSetMaximizable = (flag: boolean) =>
    currentPlatformAdapter.windowSetMaximizable(flag);
