import type { ApplicationWindowPort } from '@/capabilities/application-window';
import type {
    DocumentPreviewPort,
    ImagePreviewBytes,
} from '@/capabilities/document-preview/preview.types';
import type { OpenFilesResult, SourceFile } from '@/capabilities/document-sources';
import type { DocumentSourcesPort } from '@/capabilities/document-sources/source.port';
import { preferencesStorage } from '@/infrastructure/platform/preferences.storage';
import type { RuntimePorts } from '@/infrastructure/platform/runtime';
import type {
    BatchCompressionRequest,
    BatchCompressionResult,
    BatchFileResult,
    PickedBatchSource,
} from '@/modules/batch-compression/model';
import type { MergeExportPort } from '@/modules/merge/application/merge.port';
import type { PageCompositionPort } from '@/modules/page-composition/application';
import type { SupportPort } from '@/modules/support/support.port';
import type { AppMetadata } from '@/shared/diagnostics';
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
    if (!isPdf && !isImage) return null;

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
                passwordRequired: [],
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

async function pickBatchSourcesInBrowser(): Promise<PickedBatchSource[]> {
    if (new URLSearchParams(window.location.search).get('sample') === 'batch') {
        return [
            {
                path: '/samples/annual-report.pdf',
                name: 'annual-report.pdf',
                originalBytes: 8_742_912,
                pageCount: 24,
            },
            {
                path: '/samples/product-photo.png',
                name: 'product-photo.png',
                originalBytes: 5_281_440,
                originalDimensions: { width: 4032, height: 3024 },
            },
            {
                path: '/samples/scan.jpg',
                name: 'scan.jpg',
                originalBytes: 2_184_320,
                originalDimensions: { width: 2400, height: 3200 },
            },
            {
                path: '/samples/animation.webp',
                name: 'animation.webp',
                originalBytes: 1_048_576,
                originalDimensions: { width: 1280, height: 720 },
            },
        ];
    }
    return new Promise((resolve) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.pdf,.jpg,.jpeg,.png,.webp,.bmp,.gif,.tif,.tiff,.ico';
        input.multiple = true;
        input.onchange = () => {
            resolve(
                Array.from(input.files ?? []).map((file) => ({
                    path: URL.createObjectURL(file),
                    name: file.name,
                    originalBytes: file.size,
                })),
            );
            input.remove();
        };
        input.click();
    });
}

async function simulateBatchCompression(
    request: BatchCompressionRequest,
    onFileCompleted: (file: BatchFileResult) => void,
): Promise<BatchCompressionResult> {
    const files = request.files.map((file, index) => {
        const name = file.sourcePath.split('/').pop() ?? file.sourcePath;
        const extension = name.split('.').pop()?.toLowerCase();
        const originalBytes = [8_742_912, 5_281_440, 2_184_320, 1_048_576][index] ?? 1_000_000;
        if (name.includes('animation')) {
            return {
                sourceId: file.sourceId,
                sourcePath: file.sourcePath,
                status: 'skipped' as const,
                skipReason: 'animatedWebP' as const,
                originalBytes,
            };
        }
        const outputBytes = Math.round(originalBytes * (extension === 'pdf' ? 0.68 : 0.54));
        return {
            sourceId: file.sourceId,
            sourcePath: file.sourcePath,
            outputPath: `${request.destinationPath}/${name.replace(/\.png$/i, '.jpg')}`,
            status: index === 2 ? ('alreadyOptimized' as const) : ('compressed' as const),
            originalBytes,
            outputBytes: index === 2 ? originalBytes : outputBytes,
            pageCount: extension === 'pdf' ? 24 : undefined,
            originalDimensions: extension === 'pdf' ? undefined : { width: 4032, height: 3024 },
            outputDimensions: extension === 'pdf' ? undefined : { width: 2560, height: 1920 },
        };
    });
    await Promise.all(
        files.map(async (file, index) => {
            await new Promise((resolve) => setTimeout(resolve, 250 + index * 180));
            onFileCompleted(file);
        }),
    );
    return {
        files,
        summary: {
            compressed: files.filter((file) => file.status === 'compressed').length,
            alreadyOptimized: files.filter((file) => file.status === 'alreadyOptimized').length,
            skipped: files.filter((file) => file.status === 'skipped').length,
            failed: 0,
            originalBytes: files.reduce((total, file) => total + (file.originalBytes ?? 0), 0),
            outputBytes: files.reduce((total, file) => total + (file.outputBytes ?? 0), 0),
        },
    };
}

export const browserDocumentSources: DocumentSourcesPort = {
    openFilesDialog: () => openFilesDialogInBrowser(),
    openFilesFromPaths: async () => ({ files: [], passwordRequired: [], skippedErrors: [] }),
    unlockPdfSource: () => unsupportedInBrowser('unlockPdfSource'),
    discardPendingSources: async () => undefined,
    releaseSources: async () => undefined,
    listenForFileDrag: () => () => undefined,
};

export const browserDocumentPreview: DocumentPreviewPort = {
    getImageExportPreviewLayout: async () => unsupportedInBrowser('getImageExportPreviewLayout'),
    getImagePreview: async (): Promise<ImagePreviewBytes | null> => null,
    getSourceUrl: (path) => path,
};

const browserMergeExport: MergeExportPort = {
    savePDFDialog: () => unsupportedInBrowser('savePDFDialog'),
    mergePDFs: () => unsupportedInBrowser('mergePDFs'),
};

const browserSupport: SupportPort = {
    getAppMetadata: async () => BROWSER_APP_METADATA,
    saveTextFile: () => unsupportedInBrowser('saveTextFile'),
    openExternalUrl: async (url) => {
        window.open(url, '_blank', 'noopener,noreferrer');
    },
};

const browserApplicationWindow: ApplicationWindowPort = {
    getLogicalSize: async () => ({ width: window.innerWidth, height: window.innerHeight }),
    setSize: async () => undefined,
    setAlwaysOnTop: async () => undefined,
    setMinSize: async () => undefined,
};

const browserPageComposition: PageCompositionPort = {
    registerPdfPageRaster: () => unsupportedInBrowser('registerPdfPageRaster'),
    getPreviewLayout: async (request) => {
        const pointsPerMm = 72 / 25.4;
        const horizontal = request.layout === 'a4-side-by-side-halves';
        const pageRect = {
            xPt: 0,
            yPt: 0,
            widthPt: (horizontal ? 297 : 210) * pointsPerMm,
            heightPt: (horizontal ? 210 : 297) * pointsPerMm,
        };
        const regionRect = (position: 'top' | 'bottom') =>
            horizontal
                ? {
                      xPt: (position === 'top' ? 10 : 153.5) * pointsPerMm,
                      yPt: 10 * pointsPerMm,
                      widthPt: 133.5 * pointsPerMm,
                      heightPt: 190 * pointsPerMm,
                  }
                : {
                      xPt: 10 * pointsPerMm,
                      yPt: (position === 'top' ? 153.5 : 10) * pointsPerMm,
                      widthPt: 190 * pointsPerMm,
                      heightPt: 133.5 * pointsPerMm,
                  };
        const region = (position: 'top' | 'bottom') => {
            const bounds = regionRect(position);
            return {
                regionRect: bounds,
                drawRect: request.regions[position].source ? bounds : null,
                rotation: request.regions[position].rotation,
                clipRect: null,
                effectiveDpi: null,
                qualityWarning: false,
            };
        };
        return {
            layout: request.layout,
            pageRect,
            regions: { top: region('top'), bottom: region('bottom') },
        };
    },
    selectOutput: () => unsupportedInBrowser('selectOutput'),
    exportComposition: () => unsupportedInBrowser('exportComposition'),
};

export const browserRuntimePorts: RuntimePorts = {
    batchCompression: {
        pickSources: () => pickBatchSourcesInBrowser(),
        inspectSources: async (paths) =>
            paths.map((path) => ({
                path,
                name: path.split(/[\\/]/).pop() ?? path,
                originalBytes: 0,
            })),
        pickDestination: async () => '/Users/example/Fyler compressed',
        compress: simulateBatchCompression,
        listenForFileDrag: () => () => undefined,
    },
    documentSources: browserDocumentSources,
    documentPreview: browserDocumentPreview,
    mergeExport: browserMergeExport,
    applicationWindow: browserApplicationWindow,
    pageComposition: browserPageComposition,
    support: browserSupport,
    preferencesStorage,
};
