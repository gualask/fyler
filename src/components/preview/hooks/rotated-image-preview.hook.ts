import { useEffect, useState } from 'react';

import type { QuarterTurn } from '@/domain';
import { renderRotatedImage } from '../utils/render-image';

export function useRotatedImagePreview(
    imageSrc: string | undefined,
    imageQuarterTurns: QuarterTurn,
    useA4Container: boolean,
) {
    const [rotatedImagePreview, setRotatedImagePreview] = useState<{
        key: string;
        src: string;
    } | null>(null);

    const rotatedImagePreviewKey =
        imageSrc && !useA4Container && imageQuarterTurns !== 0
            ? `${imageSrc}:${imageQuarterTurns}`
            : null;

    useEffect(() => {
        if (!rotatedImagePreviewKey || !imageSrc) {
            return;
        }

        let active = true;
        void renderRotatedImage(imageSrc, imageQuarterTurns)
            .then((src) => {
                if (active) {
                    setRotatedImagePreview({ key: rotatedImagePreviewKey, src });
                }
            })
            .catch(() => {
                if (active) {
                    setRotatedImagePreview((current) =>
                        current?.key === rotatedImagePreviewKey ? null : current,
                    );
                }
            });

        return () => {
            active = false;
        };
    }, [imageQuarterTurns, imageSrc, rotatedImagePreviewKey]);

    const src =
        rotatedImagePreview?.key === rotatedImagePreviewKey ? rotatedImagePreview.src : null;

    return src;
}
