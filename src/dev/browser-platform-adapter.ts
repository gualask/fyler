import type { PlatformAdapter } from '@/infra/platform/platform-adapter';
import type { AppMetadata } from '@/shared/diagnostics';
import type {
    ImageExportPreviewLayout,
    MergeRequest,
    MergeResult,
    OpenFilesResult,
    SourceFile,
} from '@/shared/domain';
import { getBrowserPdfPageCount } from './browser-pdf-page-count.ts';

const BROWSER_APP_METADATA: AppMetadata = {
    appName: 'Fyler',
    version: 'dev-browser',
    identifier: 'fyler.dev-browser',
    platform: 'browser',
    arch: 'browser',
};

async function toBrowserSourceFile(file: File): Promise<SourceFile | null> {
    const normalizedName = file.name.toLowerCase();
    const isPdf = file.type === 'application/pdf' || normalizedName.endsWith('.pdf');
    const isImage = file.type.startsWith('image/');

    if (!isPdf && !isImage) {
        return null;
    }

    let pageCount: number | null = 1;
    if (isPdf) {
        try {
            pageCount = await getBrowserPdfPageCount(file);
        } catch {
            pageCount = null;
        }
    }

    return {
        id: `web-${crypto.randomUUID()}`,
        originalPath: URL.createObjectURL(file),
        name: file.name,
        byteSize: file.size,
        pageCount,
        kind: isPdf ? 'pdf' : 'image',
    };
}

async function openFilesDialogInBrowser(): Promise<OpenFilesResult> {
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,image/*';
        input.multiple = true;
        input.onchange = async () => {
            const result: OpenFilesResult = {
                files: [],
                skippedErrors: [],
            };

            for (const file of Array.from(input.files ?? [])) {
                const sourceFile = await toBrowserSourceFile(file);
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

function unsupportedInBrowser(operation: string): Promise<never> {
    return Promise.reject(new Error(`${operation} is unavailable in browser runtime`));
}

export const browserPlatformAdapter: PlatformAdapter = {
    openFilesDialog: () => openFilesDialogInBrowser(),
    savePDFDialog: () => unsupportedInBrowser('savePDFDialog'),
    saveTextFile: () => unsupportedInBrowser('saveTextFile'),
    mergePDFs: (_req: MergeRequest): Promise<MergeResult> => unsupportedInBrowser('mergePDFs'),
    getAppMetadata: async () => BROWSER_APP_METADATA,
    openExternalUrl: async (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    },
    openFilesFromPaths: async () => ({ files: [], skippedErrors: [] }),
    releaseSources: async () => undefined,
    getImageExportPreviewLayout: async (): Promise<ImageExportPreviewLayout> =>
        unsupportedInBrowser('getImageExportPreviewLayout'),
    getPreviewUrl: (path) => path,
    windowGetLogicalSize: async () => ({
        width: window.innerWidth,
        height: window.innerHeight,
    }),
    windowSetSize: async () => undefined,
    windowSetAlwaysOnTop: async () => undefined,
    windowSetMinSize: async () => undefined,
    windowSetMaxSize: async () => undefined,
    windowSetMaximizable: async () => undefined,
};
