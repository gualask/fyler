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
    SourceFile,
} from '@/shared/domain';

/**
 * Typed wrapper around the app's native (Tauri) API surface.
 *
 * Keep all direct Tauri calls centralized in `src/infra/platform/*` to make the boundary explicit.
 */
function hasNativePlatformRuntime(): boolean {
    return (
        typeof window !== 'undefined' &&
        typeof (
            window as {
                __TAURI_INTERNALS__?: {
                    invoke?: unknown;
                };
            }
        ).__TAURI_INTERNALS__?.invoke === 'function'
    );
}

function isBrowserHttpRuntime(): boolean {
    return (
        typeof window !== 'undefined' &&
        (window.location.protocol === 'http:' || window.location.protocol === 'https:')
    );
}

function toBrowserSourceFile(file: File): SourceFile | null {
    const normalizedName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || normalizedName.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
        return null;
    }

    return {
        id: `web-${crypto.randomUUID()}`,
        originalPath: URL.createObjectURL(file),
        name: file.name,
        byteSize: file.size,
        pageCount: isPdf ? null : 1,
        kind: isPdf ? 'pdf' : 'image',
    };
}

function openFilesDialogInBrowser(): Promise<OpenFilesResult> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,image/*';
        input.multiple = true;
        input.onchange = () => {
            const result: OpenFilesResult = {
                files: [],
                skippedErrors: [],
            };

            for (const file of Array.from(input.files ?? [])) {
                const sourceFile = toBrowserSourceFile(file);
                if (sourceFile) {
                    result.files.push(sourceFile);
                } else {
                    result.skippedErrors.push({
                        name: file.name,
                        reason: 'unsupported_format',
                    });
                }
            }

            input.remove();
            resolve(result);
        };
        input.click();
    });
}

export const openFilesDialog = (filterLabel: string): Promise<OpenFilesResult> => {
    if (!hasNativePlatformRuntime() && isBrowserHttpRuntime() && typeof document !== 'undefined') {
        return openFilesDialogInBrowser();
    }

    return invoke('open_files_dialog', { filterLabel });
};

export const savePDFDialog = (defaultFilename: string, filterLabel: string): Promise<string> =>
    invoke('save_pdf_dialog', { defaultFilename, filterLabel });

export const saveTextFile = (
    defaultFilename: string,
    filterLabel: string,
    content: string,
): Promise<string> => invoke('save_text_file', { defaultFilename, filterLabel, content });

export const mergePDFs = (req: MergeRequest): Promise<MergeResult> => invoke('merge_pdfs', { req });

export const getAppMetadata = (): Promise<AppMetadata> => invoke('get_app_metadata');

export const openExternalUrl = (url: string): Promise<void> => invoke('open_external_url', { url });

export const openFilesFromPaths = (paths: string[]): Promise<OpenFilesResult> =>
    invoke('open_files_from_paths', { paths });

export const releaseSources = (fileIds: string[]): Promise<void> => {
    if (!hasNativePlatformRuntime() && isBrowserHttpRuntime()) {
        return Promise.resolve();
    }

    return invoke('release_sources', { fileIds });
};

export const getImageExportPreviewLayout = (
    path: string,
    imageFit: ImageFit,
    quarterTurns: QuarterTurn,
): Promise<ImageExportPreviewLayout> =>
    invoke('get_image_export_preview_layout', { path, imageFit, quarterTurns });

/** Converts a local filesystem path into a URL that the Tauri webview can load. */
export const getPreviewUrl = (path: string): string => {
    if (isBrowserHttpRuntime() && (path.startsWith('/fixtures/') || path.startsWith('blob:'))) {
        return path;
    }

    return convertFileSrc(path);
};

export const windowGetLogicalSize = async () => {
    const win = getCurrentWindow();
    const physical = await win.innerSize();
    const scale = await win.scaleFactor();
    return physical.toLogical(scale);
};

export const windowSetSize = async (w: number, h: number) =>
    getCurrentWindow().setSize(new LogicalSize(w, h));

export const windowSetAlwaysOnTop = async (flag: boolean) =>
    getCurrentWindow().setAlwaysOnTop(flag);

export const windowSetMinSize = async (w: number, h: number) =>
    getCurrentWindow().setMinSize(new LogicalSize(w, h));

export const windowSetMaxSize = async (size: { width: number; height: number } | null) =>
    getCurrentWindow().setMaxSize(size ? new LogicalSize(size.width, size.height) : null);

export const windowSetMaximizable = async (flag: boolean) =>
    getCurrentWindow().setMaximizable(flag);
