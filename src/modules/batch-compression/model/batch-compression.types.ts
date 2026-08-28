import type { CompressionPresetValue, JpegQualityValue } from '@/capabilities/compression-profiles';

export type BatchSourceKind = 'pdf' | 'image' | 'unsupported';
type BatchImageOutputMode = 'convertToJpeg' | 'keepSourceFormat';
export type BatchFileState =
    | 'ready'
    | 'running'
    | 'compressed'
    | 'alreadyOptimized'
    | 'skipped'
    | 'failed'
    | 'needsUpdate';

export type BatchSkipReason =
    | 'unsupportedFormat'
    | 'animatedWebP'
    | 'protectedPdf'
    | 'digitallySignedPdf';

type PixelDimensions = { width: number; height: number };

export type BatchCompressionSettings = {
    preset: CompressionPresetValue;
    imageOutputMode: BatchImageOutputMode;
    jpegQuality: JpegQualityValue;
    jpegBackground: [number, number, number];
};

export type PickedBatchSource = {
    path: string;
    name: string;
    originalBytes: number;
    originalDimensions?: PixelDimensions;
    pageCount?: number;
};

export type BatchFileResult = {
    sourceId: string;
    sourcePath: string;
    outputPath?: string;
    status: 'compressed' | 'alreadyOptimized' | 'skipped' | 'failed';
    skipReason?: BatchSkipReason;
    message?: string;
    originalBytes?: number;
    outputBytes?: number;
    originalDimensions?: PixelDimensions;
    outputDimensions?: PixelDimensions;
    pageCount?: number;
};

export type BatchSummary = {
    compressed: number;
    alreadyOptimized: number;
    skipped: number;
    failed: number;
    originalBytes: number;
    outputBytes: number;
};

export type BatchRunProgress = {
    completed: number;
    total: number;
};

export type BatchCompressionResult = {
    files: BatchFileResult[];
    summary: BatchSummary;
};

export type BatchCompressionRequest = {
    destinationPath: string;
    files: Array<{ sourceId: string; sourcePath: string }>;
    settings: BatchCompressionSettings;
};

export type BatchSource = {
    id: string;
    path: string;
    name: string;
    extension: string;
    kind: BatchSourceKind;
    pickedOriginalBytes: number;
    originalDimensions?: PixelDimensions;
    pageCount?: number;
    state: BatchFileState;
    result?: BatchFileResult;
    completedFingerprint?: string;
};

export type BatchWorkspaceState = {
    sources: BatchSource[];
    settings: BatchCompressionSettings;
    destinationPath: string;
    isRunning: boolean;
    runProgress: BatchRunProgress | null;
};
