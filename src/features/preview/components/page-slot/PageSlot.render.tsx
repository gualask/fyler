import type { ReactNode } from 'react';
import {
    renderA4ContainedImage,
    renderPdfSlot,
    renderPlainImage,
    renderSpinnerSlot,
} from './PageSlot.renderers';

const A4_ASPECT_RATIO = '595/842';
const A4_MM_ASPECT_RATIO = '210/297';

function renderMatchedExportImage({
    imageSrc,
    imageRotation,
    exportMatchedImageSrc,
    isExportMatchedImagePending,
    useA4Container,
    rotatedImagePreviewStatus,
    imageFitMode,
}: {
    imageSrc: string;
    imageRotation: number;
    exportMatchedImageSrc: string | null;
    isExportMatchedImagePending: boolean;
    useA4Container: boolean;
    rotatedImagePreviewStatus: 'idle' | 'pending' | 'ready' | 'failed';
    imageFitMode: 'cover' | 'contain';
}): ReactNode {
    const needsLayoutSafeRotation = Math.abs(imageRotation) % 180 !== 0;
    const containerAspectRatio = useA4Container ? A4_ASPECT_RATIO : A4_MM_ASPECT_RATIO;

    if (exportMatchedImageSrc) {
        return (
            <img
                src={exportMatchedImageSrc}
                alt=""
                draggable={false}
                className="block h-auto w-full select-none bg-white"
            />
        );
    }
    if (isExportMatchedImagePending) {
        return renderSpinnerSlot(containerAspectRatio);
    }
    if (
        needsLayoutSafeRotation &&
        (rotatedImagePreviewStatus === 'idle' || rotatedImagePreviewStatus === 'pending')
    ) {
        return renderSpinnerSlot(containerAspectRatio);
    }
    if (needsLayoutSafeRotation && rotatedImagePreviewStatus === 'failed') {
        return renderA4ContainedImage(imageSrc, imageRotation, imageFitMode);
    }
    return renderPlainImage(imageSrc, imageRotation);
}

function renderImageSlot({
    imageSrc,
    imageRotation,
    matchExportedImages,
    exportMatchedImageSrc,
    isExportMatchedImagePending,
    useA4Container,
    rotatedImagePreviewStatus,
    imageFitMode,
}: {
    imageSrc: string;
    imageRotation: number;
    matchExportedImages: boolean;
    exportMatchedImageSrc: string | null;
    isExportMatchedImagePending: boolean;
    useA4Container: boolean;
    rotatedImagePreviewStatus: 'idle' | 'pending' | 'ready' | 'failed';
    imageFitMode: 'cover' | 'contain';
}): ReactNode {
    if (matchExportedImages) {
        return renderMatchedExportImage({
            imageSrc,
            imageRotation,
            exportMatchedImageSrc,
            isExportMatchedImagePending,
            useA4Container,
            rotatedImagePreviewStatus,
            imageFitMode,
        });
    }
    if (useA4Container) {
        return renderA4ContainedImage(imageSrc, imageRotation, imageFitMode);
    }
    return renderPlainImage(imageSrc, imageRotation);
}

/**
 * Pure rendering decision function for preview slots.
 *
 * Given already-derived inputs (image/pdf sources, rotation, cache status), it returns the correct
 * React node without triggering side-effects.
 */
export function renderSlotContent({
    isImage,
    imageSrc,
    imageRotation,
    matchExportedImages,
    exportMatchedImageSrc,
    isExportMatchedImagePending,
    useA4Container,
    rotatedImagePreviewStatus,
    imageFitMode,
    pdfSrc,
}: {
    isImage: boolean;
    imageSrc?: string;
    imageRotation: number;
    matchExportedImages: boolean;
    exportMatchedImageSrc: string | null;
    isExportMatchedImagePending: boolean;
    useA4Container: boolean;
    rotatedImagePreviewStatus: 'idle' | 'pending' | 'ready' | 'failed';
    imageFitMode: 'cover' | 'contain';
    pdfSrc?: string;
}): ReactNode {
    if (isImage && imageSrc) {
        return renderImageSlot({
            imageSrc,
            imageRotation,
            matchExportedImages,
            exportMatchedImageSrc,
            isExportMatchedImagePending,
            useA4Container,
            rotatedImagePreviewStatus,
            imageFitMode,
        });
    }

    if (pdfSrc) {
        return renderPdfSlot(pdfSrc);
    }

    return renderSpinnerSlot(A4_MM_ASPECT_RATIO);
}
