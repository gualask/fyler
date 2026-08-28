import { type Dispatch, type SetStateAction, useEffect, useMemo, useState } from 'react';
import type { QuarterTurn } from '@/shared/domain';
import { useDocumentPreviewPort } from './preview.port';
import type { DocumentPreviewPort, PreviewImageFit } from './preview.types';
import { renderExportMatchedImage } from './render-image';

type ExportMatchedImageState = {
    key: string;
    src: string | null;
} | null;

type SetExportMatchedImage = Dispatch<SetStateAction<ExportMatchedImageState>>;

interface ExportMatchedImageRequest {
    key: string;
    imageSrc: string;
    imageFileId: string;
    imageFit: PreviewImageFit;
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
    imageFileId,
    imageFit,
    imageQuarterTurns,
    matchExportedImages,
    previewWidth,
}: {
    imageSrc: string | undefined;
    imageFileId: string | undefined;
    imageFit: PreviewImageFit;
    imageQuarterTurns: QuarterTurn;
    matchExportedImages: boolean;
    previewWidth: number;
}): ExportMatchedImageRequest | null {
    if (!matchExportedImages || !imageSrc || !imageFileId) return null;

    return {
        key: `${imageFileId}:${imageFit}:${imageQuarterTurns}:${previewWidth}`,
        imageSrc,
        imageFileId,
        imageFit,
        imageQuarterTurns,
        previewWidth,
    };
}

async function renderExportMatchedImageRequest(
    request: ExportMatchedImageRequest,
    documentPreview: DocumentPreviewPort,
) {
    const layout = await documentPreview.getImageExportPreviewLayout(
        request.imageFileId,
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
    documentPreview,
    isActive,
    setExportMatchedImage,
}: {
    request: ExportMatchedImageRequest;
    documentPreview: DocumentPreviewPort;
    isActive: () => boolean;
    setExportMatchedImage: SetExportMatchedImage;
}) {
    try {
        const src = await renderExportMatchedImageRequest(request, documentPreview);
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

function useExportMatchedImageState(
    request: ExportMatchedImageRequest | null,
    documentPreview: DocumentPreviewPort,
) {
    const [exportMatchedImage, setExportMatchedImage] = useState<ExportMatchedImageState>(null);

    useEffect(() => {
        if (!request) return;

        let active = true;
        void renderAndStoreExportMatchedImage({
            request,
            documentPreview,
            isActive: () => active,
            setExportMatchedImage,
        });

        return () => {
            active = false;
            clearExportMatchedImage(setExportMatchedImage, request.key);
        };
    }, [documentPreview, request]);

    return exportMatchedImage;
}

export function useExportMatchedImage(
    imageSrc: string | undefined,
    imageFileId: string | undefined,
    imageFit: PreviewImageFit,
    imageQuarterTurns: QuarterTurn,
    matchExportedImages: boolean,
    previewWidth = 900,
) {
    const documentPreview = useDocumentPreviewPort();
    const request = useMemo(
        () =>
            createExportMatchedImageRequest({
                imageSrc,
                imageFileId,
                imageFit,
                imageQuarterTurns,
                matchExportedImages,
                previewWidth,
            }),
        [imageFit, imageFileId, imageQuarterTurns, imageSrc, matchExportedImages, previewWidth],
    );
    const exportMatchedImage = useExportMatchedImageState(request, documentPreview);
    const exportPreviewKey = request?.key ?? null;

    const exportSettled = exportMatchedImage?.key === exportPreviewKey;
    const exportMatchedImageSrc =
        exportSettled && exportMatchedImage?.src ? exportMatchedImage.src : null;

    return {
        exportMatchedImageSrc,
        isExportMatchedImagePending: Boolean(exportPreviewKey) && !exportSettled,
    };
}
