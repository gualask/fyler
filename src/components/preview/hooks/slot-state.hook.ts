import { useEffect, useMemo } from 'react';

import { getImageQuarterTurn, getImageRotationDegrees } from '@/domain/file-edits';
import { buildPreviewRenderRequest, usePdfCache } from '@/pdf';
import { getPreviewUrl } from '@/platform';
import type { SlotContext, SlotPage } from '../models/slot-model';
import { useSlotVisibility } from './slot-visibility.hook';
import { useRotatedImagePreview } from './rotated-image-preview.hook';
import { useExportMatchedImage } from './export-matched-image.hook';

export function useSlotState(page: SlotPage, context: SlotContext) {
    const { fp, file, edits, index } = page;
    const { scrollRoot, imageFit, matchExportedImages, onVisible } = context;
    const { requestRenders, getRender } = usePdfCache();

    const isImage = file?.kind === 'image';
    const imageQuarterTurns = getImageQuarterTurn(edits);
    const imageRotation = getImageRotationDegrees(edits);
    const useA4Container = isImage && (imageFit === 'contain' || imageFit === 'cover');
    const previewRequest = useMemo(
        () => (file?.kind === 'pdf' ? buildPreviewRenderRequest(fp.pageNum, edits) : null),
        [edits, file?.kind, fp.pageNum],
    );
    const pdfSrc = file && previewRequest ? getRender(file.id, previewRequest) : undefined;
    const imageSrc = file?.kind === 'image' ? getPreviewUrl(file.originalPath) : undefined;

    const { slotRef, shouldRender } = useSlotVisibility(scrollRoot, index, onVisible);

    useEffect(() => {
        if (!shouldRender || !file || !previewRequest) return;
        requestRenders(file, [previewRequest]);
    }, [file, previewRequest, requestRenders, shouldRender]);

    const rotatedImagePreviewSrc = useRotatedImagePreview(imageSrc, imageQuarterTurns, useA4Container);

    const { exportMatchedImageSrc, isExportMatchedImagePending } = useExportMatchedImage(
        imageSrc,
        file?.originalPath,
        imageFit,
        imageQuarterTurns,
        matchExportedImages,
    );

    return {
        slotRef,
        isImage,
        imageSrc: rotatedImagePreviewSrc ?? imageSrc,
        imageRotation: rotatedImagePreviewSrc ? 0 : imageRotation,
        pdfSrc,
        useA4Container,
        imageFitMode: imageFit === 'cover' ? 'cover' : 'contain',
        exportMatchedImageSrc,
        isExportMatchedImagePending,
    };
}
