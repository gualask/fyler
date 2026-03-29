import { useEffect, useState } from 'react';

import type { ImageFit, QuarterTurn } from '@/domain';
import { getImageExportPreviewLayout } from '@/platform';
import { renderExportMatchedImage } from '../utils/render-image';

function maybeRevokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

export function useExportMatchedImage(
    imageSrc: string | undefined,
    imageOriginalPath: string | undefined,
    imageFit: ImageFit,
    imageQuarterTurns: QuarterTurn,
    matchExportedImages: boolean,
) {
    const [exportMatchedImage, setExportMatchedImage] = useState<{
        key: string;
        src: string | null;
    } | null>(null);

    const exportPreviewKey =
        matchExportedImages && imageSrc && imageOriginalPath
            ? `${imageOriginalPath}:${imageFit}:${imageQuarterTurns}`
            : null;

    useEffect(() => {
        if (!exportPreviewKey || !imageSrc || !imageOriginalPath) {
            return;
        }

        let active = true;
        void getImageExportPreviewLayout(imageOriginalPath, imageFit, imageQuarterTurns)
            .then((layout) => renderExportMatchedImage(imageSrc, layout, imageQuarterTurns))
            .then((src) => {
                if (active) {
                    setExportMatchedImage((current) => {
                        if (current?.key === exportPreviewKey) {
                            maybeRevokeObjectUrl(current.src);
                        }
                        return { key: exportPreviewKey, src };
                    });
                } else {
                    maybeRevokeObjectUrl(src);
                }
            })
            .catch(() => {
                if (active) {
                    setExportMatchedImage({ key: exportPreviewKey ?? '', src: null });
                }
            });

        return () => {
            active = false;
            setExportMatchedImage((current) => {
                if (current?.key === exportPreviewKey) {
                    maybeRevokeObjectUrl(current.src);
                    return null;
                }
                return current;
            });
        };
    }, [exportPreviewKey, imageFit, imageOriginalPath, imageQuarterTurns, imageSrc]);

    const exportSettled = exportMatchedImage?.key === exportPreviewKey;
    const exportMatchedImageSrc =
        exportSettled && exportMatchedImage?.src ? exportMatchedImage.src : null;

    return {
        exportMatchedImageSrc,
        isExportMatchedImagePending: Boolean(exportPreviewKey) && !exportSettled,
    };
}
