import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import { getImageExportPreviewLayout } from '@/infra/platform';
import type { ImageFit, QuarterTurn } from '@/shared/domain';
import { renderExportMatchedImage } from '@/shared/ui/image-preview';

type ExportMatchedImageState = {
    key: string;
    src: string | null;
} | null;

type SetExportMatchedImage = Dispatch<SetStateAction<ExportMatchedImageState>>;

interface ExportMatchedImageRequest {
    key: string;
    imageSrc: string;
    imageOriginalPath: string;
    imageFit: ImageFit;
    imageQuarterTurns: QuarterTurn;
    previewWidth: number;
}

function maybeRevokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

function createExportMatchedImageRequest({
    imageSrc,
    imageOriginalPath,
    imageFit,
    imageQuarterTurns,
    matchExportedImages,
    previewWidth,
}: {
    imageSrc: string | undefined;
    imageOriginalPath: string | undefined;
    imageFit: ImageFit;
    imageQuarterTurns: QuarterTurn;
    matchExportedImages: boolean;
    previewWidth: number;
}): ExportMatchedImageRequest | null {
    if (!matchExportedImages || !imageSrc || !imageOriginalPath) return null;

    return {
        key: `${imageOriginalPath}:${imageFit}:${imageQuarterTurns}:${previewWidth}`,
        imageSrc,
        imageOriginalPath,
        imageFit,
        imageQuarterTurns,
        previewWidth,
    };
}

async function renderExportMatchedImageRequest(request: ExportMatchedImageRequest) {
    const layout = await getImageExportPreviewLayout(
        request.imageOriginalPath,
        request.imageFit,
        request.imageQuarterTurns,
    );

    return renderExportMatchedImage(
        request.imageSrc,
        layout,
        request.imageQuarterTurns,
        request.previewWidth,
    );
}

function storeRenderedExportMatchedImage(
    setExportMatchedImage: SetExportMatchedImage,
    key: string,
    src: string,
) {
    setExportMatchedImage((current) => {
        if (current?.key === key) {
            maybeRevokeObjectUrl(current.src);
        }
        return { key, src };
    });
}

function storeFailedExportMatchedImage(setExportMatchedImage: SetExportMatchedImage, key: string) {
    setExportMatchedImage({ key, src: null });
}

function clearExportMatchedImage(setExportMatchedImage: SetExportMatchedImage, key: string) {
    setExportMatchedImage((current) => {
        if (current?.key === key) {
            maybeRevokeObjectUrl(current.src);
            return null;
        }
        return current;
    });
}

async function renderAndStoreExportMatchedImage({
    request,
    isActive,
    setExportMatchedImage,
}: {
    request: ExportMatchedImageRequest;
    isActive: () => boolean;
    setExportMatchedImage: SetExportMatchedImage;
}) {
    try {
        const src = await renderExportMatchedImageRequest(request);
        if (isActive()) {
            storeRenderedExportMatchedImage(setExportMatchedImage, request.key, src);
        } else {
            maybeRevokeObjectUrl(src);
        }
    } catch {
        if (isActive()) {
            storeFailedExportMatchedImage(setExportMatchedImage, request.key);
        }
    }
}

function useExportMatchedImageState(request: ExportMatchedImageRequest | null) {
    const [exportMatchedImage, setExportMatchedImage] = useState<ExportMatchedImageState>(null);

    useEffect(() => {
        if (!request) return;

        let active = true;
        void renderAndStoreExportMatchedImage({
            request,
            isActive: () => active,
            setExportMatchedImage,
        });

        return () => {
            active = false;
            clearExportMatchedImage(setExportMatchedImage, request.key);
        };
    }, [request]);

    return exportMatchedImage;
}

export function useExportMatchedImage(
    imageSrc: string | undefined,
    imageOriginalPath: string | undefined,
    imageFit: ImageFit,
    imageQuarterTurns: QuarterTurn,
    matchExportedImages: boolean,
    previewWidth = 900,
) {
    const request = useMemo(
        () =>
            createExportMatchedImageRequest({
                imageSrc,
                imageOriginalPath,
                imageFit,
                imageQuarterTurns,
                matchExportedImages,
                previewWidth,
            }),
        [
            imageFit,
            imageOriginalPath,
            imageQuarterTurns,
            imageSrc,
            matchExportedImages,
            previewWidth,
        ],
    );
    const exportMatchedImage = useExportMatchedImageState(request);
    const exportPreviewKey = request?.key ?? null;

    const exportSettled = exportMatchedImage?.key === exportPreviewKey;
    const exportMatchedImageSrc =
        exportSettled && exportMatchedImage?.src ? exportMatchedImage.src : null;

    return {
        exportMatchedImageSrc,
        isExportMatchedImagePending: Boolean(exportPreviewKey) && !exportSettled,
    };
}
