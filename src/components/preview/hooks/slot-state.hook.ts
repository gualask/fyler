import { useEffect, useMemo } from 'react';

import { getImageQuarterTurn, getImageRotationDegrees } from '@/domain/file-edits';
import { buildPreviewRenderRequest, usePdfCache, usePdfRenderSrc } from '@/pdf';
import { getPreviewUrl } from '@/platform';
import type { SlotContext, SlotPage } from '../models/slot-model';
import { useExportMatchedImage } from './export-matched-image.hook';
import { useRotatedImagePreview } from './rotated-image-preview.hook';
import { useSlotVisibility } from './slot-visibility.hook';

export function useSlotState(page: SlotPage, context: SlotContext) {
    const { fp, file, edits, index } = page;
    const { scrollRoot, imageFit, matchExportedImages, onVisible } = context;
    const { requestRenders, getPageAspectRatio } = usePdfCache();

    const isImage = file?.kind === 'image';
    const imageQuarterTurns = getImageQuarterTurn(edits);
    const imageRotation = getImageRotationDegrees(edits);
    const useA4Container = isImage && (imageFit === 'contain' || imageFit === 'cover');
    const previewRequest = useMemo(
        () => (file?.kind === 'pdf' ? buildPreviewRenderRequest(fp.pageNum, edits) : null),
        [edits, file?.kind, fp.pageNum],
    );
    const pdfSrc = usePdfRenderSrc(file, previewRequest);
    const pdfAspectRatio =
        file?.kind === 'pdf' && previewRequest
            ? getPageAspectRatio(file.id, previewRequest.pageNum, previewRequest.quarterTurns)
            : undefined;
    const imageSrc = file?.kind === 'image' ? getPreviewUrl(file.originalPath) : undefined;

    const { slotRef, shouldRender } = useSlotVisibility(scrollRoot, index, onVisible);

    useEffect(() => {
        if (!shouldRender || !file || !previewRequest) return;
        requestRenders(file, [previewRequest]);
    }, [file, previewRequest, requestRenders, shouldRender]);

    const { exportMatchedImageSrc, isExportMatchedImagePending } = useExportMatchedImage(
        imageSrc,
        file?.originalPath,
        imageFit,
        imageQuarterTurns,
        matchExportedImages,
    );

    const shouldPrerotateAsFallback =
        matchExportedImages &&
        Boolean(imageSrc) &&
        !useA4Container &&
        imageQuarterTurns !== 0 &&
        !isExportMatchedImagePending &&
        !exportMatchedImageSrc;

    const rotatedImagePreview = useRotatedImagePreview(
        imageSrc,
        imageQuarterTurns,
        !shouldPrerotateAsFallback,
    );

    const effectiveImageSrc =
        shouldPrerotateAsFallback &&
        rotatedImagePreview.status === 'ready' &&
        rotatedImagePreview.src
            ? rotatedImagePreview.src
            : imageSrc;

    return {
        slotRef,
        isImage,
        imageSrc: effectiveImageSrc,
        imageRotation:
            shouldPrerotateAsFallback &&
            rotatedImagePreview.status === 'ready' &&
            rotatedImagePreview.src
                ? 0
                : imageRotation,
        rotatedImagePreviewStatus: rotatedImagePreview.status,
        pdfSrc,
        pdfAspectRatio,
        useA4Container,
        imageFitMode: imageFit === 'cover' ? 'cover' : 'contain',
        exportMatchedImageSrc,
        isExportMatchedImagePending,
    };
}
