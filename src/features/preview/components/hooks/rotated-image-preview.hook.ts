import { useEffect, useState } from 'react';

import type { QuarterTurn } from '@/shared/domain';
import { renderRotatedImage } from '@/shared/ui/image-preview';

export type RotatedImagePreviewStatus = 'idle' | 'pending' | 'ready' | 'failed';

function maybeRevokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

export function useRotatedImagePreview(
    imageSrc: string | undefined,
    imageQuarterTurns: QuarterTurn,
    useA4Container: boolean,
) {
    const [rotatedImagePreview, setRotatedImagePreview] = useState<{
        key: string;
        src: string | null;
        status: RotatedImagePreviewStatus;
    } | null>(null);

    const rotatedImagePreviewKey =
        imageSrc && !useA4Container && imageQuarterTurns !== 0
            ? `${imageSrc}:${imageQuarterTurns}`
            : null;

    useEffect(() => {
        if (!rotatedImagePreviewKey || !imageSrc) {
            setRotatedImagePreview(null);
            return;
        }

        let active = true;
        setRotatedImagePreview((current) =>
            current?.key === rotatedImagePreviewKey
                ? current
                : { key: rotatedImagePreviewKey, src: null, status: 'pending' },
        );
        void renderRotatedImage(imageSrc, imageQuarterTurns)
            .then((src) => {
                if (!active) {
                    maybeRevokeObjectUrl(src);
                    return;
                }

                setRotatedImagePreview((current) => {
                    if (current?.key === rotatedImagePreviewKey) {
                        maybeRevokeObjectUrl(current.src);
                    }
                    return { key: rotatedImagePreviewKey, src, status: 'ready' };
                });
            })
            .catch(() => {
                if (active) {
                    setRotatedImagePreview((current) =>
                        current?.key === rotatedImagePreviewKey
                            ? { key: rotatedImagePreviewKey, src: null, status: 'failed' }
                            : current,
                    );
                }
            });

        return () => {
            active = false;
            setRotatedImagePreview((current) => {
                if (current?.key === rotatedImagePreviewKey) {
                    maybeRevokeObjectUrl(current.src);
                    return null;
                }
                return current;
            });
        };
    }, [imageQuarterTurns, imageSrc, rotatedImagePreviewKey]);

    if (!rotatedImagePreviewKey) return { src: null, status: 'idle' as const };

    if (rotatedImagePreview?.key !== rotatedImagePreviewKey) {
        return { src: null, status: 'pending' as const };
    }

    return { src: rotatedImagePreview.src, status: rotatedImagePreview.status };
}
