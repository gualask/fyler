import type { ReactNode } from 'react';

const A4_ASPECT_RATIO = '595/842';
const A4_MM_ASPECT_RATIO = '210/297';

function renderSpinnerSlot(aspectRatio: string) {
    return (
        <div className="flex w-full items-center justify-center bg-white" style={{ aspectRatio }}>
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
        </div>
    );
}

function renderImage(
    src: string,
    {
        className,
        style,
    }: {
        className: string;
        style?: React.CSSProperties;
    },
) {
    return <img src={src} alt="" draggable={false} className={className} style={style} />;
}

function renderPdfSlot(src: string) {
    return renderImage(src, { className: 'block h-auto w-full select-none bg-white' });
}
function renderPlainImage(src: string, rotation: number) {
    return renderImage(src, {
        className: 'block h-auto w-full select-none bg-white',
        style: { transform: `rotate(${rotation}deg)` },
    });
}

function renderA4ContainedImage(src: string, rotation: number, fitMode: 'cover' | 'contain') {
    return (
        <div
            className="relative w-full overflow-hidden bg-white"
            style={{ aspectRatio: A4_ASPECT_RATIO }}
        >
            {renderImage(src, {
                className: [
                    'absolute inset-0 h-full w-full select-none',
                    fitMode === 'cover' ? 'object-cover' : 'object-contain',
                ].join(' '),
                style: { transform: `rotate(${rotation}deg)` },
            })}
        </div>
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
        return renderImage(exportMatchedImageSrc, {
            className: 'block h-auto w-full select-none bg-white',
        });
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
