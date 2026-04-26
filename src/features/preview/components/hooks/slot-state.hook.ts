import { useEffect, useMemo } from 'react';
import {
    buildPreviewRenderRequest,
    type PdfRenderRequest,
    useExportMatchedImage,
    usePdfCache,
    usePdfRenderSrc,
} from '@/infra/pdf';
import { getPreviewUrl } from '@/infra/platform';
import type { FileEdits, FinalPage, ImageFit, QuarterTurn, SourceFile } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import type { SlotContext, SlotPage } from '../slot.types';
import {
    type RotatedImagePreviewStatus,
    useRotatedImagePreview,
} from './rotated-image-preview.hook';
import { useSlotVisibility } from './slot-visibility.hook';

type ImageFitMode = 'cover' | 'contain';
type GetPageAspectRatio = ReturnType<typeof usePdfCache>['getPageAspectRatio'];

interface ImagePreviewState {
    isImage: boolean;
    src: string | undefined;
    originalPath: string | undefined;
    quarterTurns: QuarterTurn;
    rotation: number;
    useA4Container: boolean;
    fitMode: ImageFitMode;
}

interface RotatedImagePreview {
    src: string | null;
    status: RotatedImagePreviewStatus;
}

function imagePreviewState(
    file: SourceFile | undefined,
    edits: FileEdits,
    imageFit: ImageFit,
): ImagePreviewState {
    const isImage = file?.kind === 'image';
    const quarterTurns = FileEditsVO.getImageQuarterTurn(edits);
    const rotation = FileEditsVO.getImageRotationDegrees(edits);

    return {
        isImage,
        src: isImage ? getPreviewUrl(file.originalPath) : undefined,
        originalPath: isImage ? file.originalPath : undefined,
        quarterTurns,
        rotation,
        useA4Container: isImage && (imageFit === 'contain' || imageFit === 'cover'),
        fitMode: imageFit === 'cover' ? 'cover' : 'contain',
    };
}

function previewRenderRequest(
    fileKind: SourceFile['kind'] | undefined,
    fp: FinalPage,
    edits: FileEdits,
): PdfRenderRequest | null {
    return fileKind === 'pdf' && fp.kind === 'pdf'
        ? buildPreviewRenderRequest(fp.pageNum, edits)
        : null;
}

function pdfAspectRatio(
    file: SourceFile | undefined,
    previewRequest: PdfRenderRequest | null,
    getPageAspectRatio: GetPageAspectRatio,
): number | undefined {
    if (file?.kind !== 'pdf' || !previewRequest) return undefined;
    return getPageAspectRatio(file.id, previewRequest.pageNum, previewRequest.quarterTurns);
}

function shouldPrerotateImageFallback({
    matchExportedImagesActive,
    imageSrc,
    useA4Container,
    imageQuarterTurns,
    isExportMatchedImagePending,
    exportMatchedImageSrc,
}: {
    matchExportedImagesActive: boolean;
    imageSrc: string | undefined;
    useA4Container: boolean;
    imageQuarterTurns: QuarterTurn;
    isExportMatchedImagePending: boolean;
    exportMatchedImageSrc: string | null;
}): boolean {
    return (
        matchExportedImagesActive &&
        Boolean(imageSrc) &&
        !useA4Container &&
        imageQuarterTurns !== 0 &&
        !isExportMatchedImagePending &&
        !exportMatchedImageSrc
    );
}

function effectiveImagePreview(
    imageSrc: string | undefined,
    imageRotation: number,
    shouldPrerotateAsFallback: boolean,
    rotatedImagePreview: RotatedImagePreview,
): { src: string | undefined; rotation: number } {
    if (
        shouldPrerotateAsFallback &&
        rotatedImagePreview.status === 'ready' &&
        rotatedImagePreview.src
    ) {
        return { src: rotatedImagePreview.src, rotation: 0 };
    }

    return { src: imageSrc, rotation: imageRotation };
}

export function useSlotState(page: SlotPage, context: SlotContext) {
    const { fp, file, edits, index } = page;
    const { scrollRoot, imageFit, matchExportedImages, onVisible } = context;
    const { requestRenders, getPageAspectRatio } = usePdfCache();

    const { slotRef, shouldRender } = useSlotVisibility(scrollRoot, index, onVisible);

    const imagePreview = imagePreviewState(file, edits, imageFit);
    const matchExportedImagesActive = Boolean(matchExportedImages && shouldRender);
    const previewRequest = useMemo(
        () => previewRenderRequest(file?.kind, fp, edits),
        [edits, file?.kind, fp],
    );
    const pdfSrc = usePdfRenderSrc(file, previewRequest);
    const resolvedPdfAspectRatio = pdfAspectRatio(file, previewRequest, getPageAspectRatio);

    useEffect(() => {
        if (!shouldRender || !file || !previewRequest) return;
        requestRenders(file, [previewRequest]);
    }, [file, previewRequest, requestRenders, shouldRender]);

    const { exportMatchedImageSrc, isExportMatchedImagePending } = useExportMatchedImage(
        imagePreview.src,
        imagePreview.originalPath,
        imageFit,
        imagePreview.quarterTurns,
        matchExportedImagesActive,
    );

    const shouldPrerotateAsFallback = shouldPrerotateImageFallback({
        matchExportedImagesActive,
        imageSrc: imagePreview.src,
        useA4Container: imagePreview.useA4Container,
        imageQuarterTurns: imagePreview.quarterTurns,
        isExportMatchedImagePending,
        exportMatchedImageSrc,
    });

    const rotatedImagePreview = useRotatedImagePreview(
        imagePreview.src,
        imagePreview.quarterTurns,
        !shouldPrerotateAsFallback,
    );

    const effectiveImage = effectiveImagePreview(
        imagePreview.src,
        imagePreview.rotation,
        shouldPrerotateAsFallback,
        rotatedImagePreview,
    );

    return {
        slotRef,
        isImage: imagePreview.isImage,
        imageSrc: effectiveImage.src,
        imageRotation: effectiveImage.rotation,
        rotatedImagePreviewStatus: rotatedImagePreview.status,
        pdfSrc,
        pdfAspectRatio: resolvedPdfAspectRatio,
        useA4Container: imagePreview.useA4Container,
        imageFitMode: imagePreview.fitMode,
        exportMatchedImageSrc,
        isExportMatchedImagePending,
    };
}
