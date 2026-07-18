import type { PlatformAdapter } from './platform-adapter.ts';

export function createStubPlatformAdapter(
    overrides: Partial<PlatformAdapter> = {},
): PlatformAdapter {
    return {
        openFilesDialog: async () => ({ files: [], passwordRequired: [], skippedErrors: [] }),
        savePDFDialog: async () => '',
        saveTextFile: async () => '',
        mergePDFs: async () => {
            throw new Error('not implemented');
        },
        getAppMetadata: async () => ({
            appName: 'Fyler',
            version: 'test',
            identifier: 'test',
            platform: 'test',
            arch: 'test',
        }),
        openExternalUrl: async () => undefined,
        openFilesFromPaths: async () => ({ files: [], passwordRequired: [], skippedErrors: [] }),
        unlockPdfSource: async () => {
            throw new Error('not implemented');
        },
        discardPendingSources: async () => undefined,
        releaseSources: async () => undefined,
        getImageExportPreviewLayout: async () => {
            throw new Error('not implemented');
        },
        getImagePreview: async () => null,
        getSourceUrl: (path) => path,
        windowGetLogicalSize: async () => ({ width: 0, height: 0 }),
        windowSetSize: async () => undefined,
        windowSetAlwaysOnTop: async () => undefined,
        windowSetMinSize: async () => undefined,
        windowSetMaxSize: async () => undefined,
        windowSetMaximizable: async () => undefined,
        ...overrides,
    };
}
