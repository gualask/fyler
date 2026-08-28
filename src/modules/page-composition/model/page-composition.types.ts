import type { CompressionPresetValue, JpegQualityValue } from '@/capabilities/compression-profiles';
import type { SourceFile } from '@/capabilities/document-sources';

export type QuarterTurn = 0 | 1 | 2 | 3;
export type CompositionRegionKey = 'top' | 'bottom';
export type CompositionLayout = 'a4-stacked-halves' | 'a4-side-by-side-halves';
export type CompositionOutputFormat = 'pdf' | 'jpeg';
export type CompositionCompressionPreset = CompressionPresetValue;
export type CompositionJpegQuality = JpegQualityValue;

export type CompositionSource =
    | { kind: 'image'; file: SourceFile }
    | { kind: 'pdf-page'; file: SourceFile; pageNum: number; rasterFile: SourceFile };

type CompositionRegion = {
    source: CompositionSource | null;
    rotation: QuarterTurn;
};

export type PageComposition = {
    layout: CompositionLayout;
    regions: Record<CompositionRegionKey, CompositionRegion>;
};

export type Rect = {
    xPt: number;
    yPt: number;
    widthPt: number;
    heightPt: number;
};

type RegionPreviewLayout = {
    regionRect: Rect;
    drawRect: Rect | null;
    rotation: QuarterTurn;
    clipRect: Rect | null;
    effectiveDpi: number | null;
    qualityWarning: boolean;
};

export type CompositionPreviewLayout = {
    layout: CompositionLayout;
    pageRect: Rect;
    regions: Record<CompositionRegionKey, RegionPreviewLayout>;
};

export type PreviewLayoutRequest = {
    layout: CompositionLayout;
    regions: Record<
        CompositionRegionKey,
        {
            source: { fileId: string; kind: 'image' | 'pdf-page-raster' } | null;
            rotation: QuarterTurn;
        }
    >;
};

export type PageCompositionExportRequest = {
    outputPath: string;
    outputFormat: CompositionOutputFormat;
    layout: CompositionLayout;
    regions: Record<CompositionRegionKey, { fileId: string; rotation: QuarterTurn }>;
    optimization: {
        preset: CompositionCompressionPreset;
        jpegQuality: CompositionJpegQuality;
    };
};

export type PageCompositionResult = { pageCount: 1 };
