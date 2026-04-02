import type { ReactNode } from 'react';
import { useSlotState } from '../hooks/slot-state.hook';
import type { SlotContext, SlotPage } from '../models/slot-model';

const BASE_WIDTH = 680;
const A4_ASPECT_RATIO = '595/842';
const A4_MM_ASPECT_RATIO = '210/297';

interface Props {
    page: SlotPage;
    context: SlotContext;
}

function resolveZoomLevel(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
}

function renderSpinnerSlot(aspectRatio: string) {
    return (
        <div className="flex w-full items-center justify-center bg-white" style={{ aspectRatio }}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
        </div>
    );
}

function renderExportMatchedImage(src: string) {
    return (
        <img
            src={src}
            alt=""
            draggable={false}
            className="block h-auto w-full select-none bg-white"
        />
    );
}

function renderPdfSlot(src: string) {
    return (
        <img
            src={src}
            alt=""
            draggable={false}
            className="block h-auto w-full select-none bg-white"
        />
    );
}

function renderA4ContainedImage(src: string, rotation: number, fitMode: 'cover' | 'contain') {
    return (
        <div
            className="relative w-full overflow-hidden bg-white"
            style={{ aspectRatio: A4_ASPECT_RATIO }}
        >
            <img
                src={src}
                alt=""
                draggable={false}
                className={[
                    'absolute inset-0 h-full w-full select-none',
                    fitMode === 'cover' ? 'object-cover' : 'object-contain',
                ].join(' ')}
                style={{ transform: `rotate(${rotation}deg)` }}
            />
        </div>
    );
}

function renderPlainImage(src: string, rotation: number) {
    return (
        <img
            src={src}
            alt=""
            draggable={false}
            className="block h-auto w-full select-none bg-white"
            style={{ transform: `rotate(${rotation}deg)` }}
        />
    );
}

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
        return renderExportMatchedImage(exportMatchedImageSrc);
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

function renderSlotContent({
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

export function PageSlot({ page, context }: Props) {
    const {
        slotRef,
        isImage,
        imageSrc,
        imageRotation,
        rotatedImagePreviewStatus,
        pdfSrc,
        pdfAspectRatio,
        useA4Container,
        imageFitMode,
        exportMatchedImageSrc,
        isExportMatchedImagePending,
    } = useSlotState(page, context);

    const zoomLevel = resolveZoomLevel(context.zoomLevel);

    const slotWidth =
        typeof pdfAspectRatio === 'number' && Number.isFinite(pdfAspectRatio) && pdfAspectRatio > 0
            ? BASE_WIDTH * Math.max(1, pdfAspectRatio) * zoomLevel
            : BASE_WIDTH * zoomLevel;

    const normalizedImageFitMode = imageFitMode === 'cover' ? 'cover' : 'contain';

    const content = renderSlotContent({
        isImage,
        imageSrc,
        imageRotation,
        matchExportedImages: context.matchExportedImages,
        exportMatchedImageSrc,
        isExportMatchedImagePending,
        useA4Container,
        rotatedImagePreviewStatus,
        imageFitMode: normalizedImageFitMode,
        pdfSrc,
    });

    return (
        <div ref={slotRef} style={{ width: slotWidth }} className="mx-auto mb-4 shadow-lg">
            {content}
        </div>
    );
}
