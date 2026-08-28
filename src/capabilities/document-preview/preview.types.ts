import type { QuarterTurn } from '@/shared/domain';

/** Bytes returned by the native image-preview command. */
export type ImagePreviewBytes = ArrayBuffer | Uint8Array | number[];

export type ImagePreviewRequest = {
    fileId: string;
    originalPath: string;
    maxSide?: number;
};

/** Fit modes understood by the merge preview/export contract. */
export type PreviewImageFit = 'fit' | 'contain' | 'cover';

/** Geometry returned by the image-export preview command. */
export type ImageExportPreviewLayout = {
    pageWidthPt: number;
    pageHeightPt: number;
    drawXPt: number;
    drawYPt: number;
    drawWidthPt: number;
    drawHeightPt: number;
    clipToPage: boolean;
    fillBackground: boolean;
};

export type DocumentPreviewPort = {
    getSourceUrl(path: string): string;
    getImagePreview(request: ImagePreviewRequest): Promise<ImagePreviewBytes | null>;
    getImageExportPreviewLayout(
        fileId: string,
        imageFit: PreviewImageFit,
        quarterTurns: QuarterTurn,
    ): Promise<ImageExportPreviewLayout>;
};
