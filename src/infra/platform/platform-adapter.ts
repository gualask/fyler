import type { AppMetadata } from '@/shared/diagnostics';
import type {
    ImageExportPreviewLayout,
    ImageFit,
    MergeRequest,
    MergeResult,
    OpenFilesResult,
    QuarterTurn,
} from '@/shared/domain';

export type ImagePreviewBytes = ArrayBuffer | Uint8Array | number[];

export interface PlatformAdapter {
    openFilesDialog(filterLabel: string): Promise<OpenFilesResult>;
    savePDFDialog(defaultFilename: string, filterLabel: string): Promise<string>;
    saveTextFile(defaultFilename: string, filterLabel: string, content: string): Promise<string>;
    mergePDFs(req: MergeRequest): Promise<MergeResult>;
    getAppMetadata(): Promise<AppMetadata>;
    openExternalUrl(url: string): Promise<void>;
    openFilesFromPaths(paths: string[]): Promise<OpenFilesResult>;
    unlockPdfSource(path: string, password: string): Promise<OpenFilesResult['files'][number]>;
    discardPendingSources(paths: string[]): Promise<void>;
    releaseSources(fileIds: string[]): Promise<void>;
    getImageExportPreviewLayout(
        fileId: string,
        imageFit: ImageFit,
        quarterTurns: QuarterTurn,
    ): Promise<ImageExportPreviewLayout>;
    getImagePreview(fileId: string): Promise<ImagePreviewBytes | null>;
    getSourceUrl(path: string): string;
    windowGetLogicalSize(): Promise<{ width: number; height: number }>;
    windowSetSize(w: number, h: number): Promise<void>;
    windowSetAlwaysOnTop(flag: boolean): Promise<void>;
    windowSetMinSize(w: number, h: number): Promise<void>;
    windowSetMaxSize(size: { width: number; height: number } | null): Promise<void>;
    windowSetMaximizable(flag: boolean): Promise<void>;
}
