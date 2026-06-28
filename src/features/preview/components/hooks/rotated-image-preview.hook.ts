import { useEffect, useState } from 'react';

import type { QuarterTurn } from '@/shared/domain';
import { renderRotatedImage } from '@/shared/ui/image-preview';

export type RotatedImagePreviewStatus = 'idle' | 'pending' | 'ready' | 'failed';

type RotatedImagePreview = {
    key: string;
    src: string | null;
    status: RotatedImagePreviewStatus;
};

type RotatedImagePreviewResult = {
    src: string | null;
    status: RotatedImagePreviewStatus;
};

function maybeRevokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

function rotatedPreviewKey(
    imageSrc: string | undefined,
    imageQuarterTurns: QuarterTurn,
    useA4Container: boolean,
): string | null {
    return imageSrc && !useA4Container && imageQuarterTurns !== 0
        ? `${imageSrc}:${imageQuarterTurns}`
        : null;
}

function pendingPreviewForKey(
    current: RotatedImagePreview | null,
    key: string,
): RotatedImagePreview {
    return current?.key === key ? current : { key, src: null, status: 'pending' };
}

function readyPreviewForKey(
    current: RotatedImagePreview | null,
    key: string,
    src: string,
): RotatedImagePreview {
    if (current?.key === key) {
        maybeRevokeObjectUrl(current.src);
    }

    return { key, src, status: 'ready' };
}

function failedPreviewForKey(
    current: RotatedImagePreview | null,
    key: string,
): RotatedImagePreview | null {
    return current?.key === key ? { key, src: null, status: 'failed' } : current;
}

function clearedPreviewForKey(
    current: RotatedImagePreview | null,
    key: string,
): RotatedImagePreview | null {
    if (current?.key !== key) return current;

    maybeRevokeObjectUrl(current.src);
    return null;
}

function previewResult(
    key: string | null,
    preview: RotatedImagePreview | null,
): RotatedImagePreviewResult {
    if (!key) return { src: null, status: 'idle' };
    if (preview?.key !== key) return { src: null, status: 'pending' };

    return { src: preview.src, status: preview.status };
}

export function useRotatedImagePreview(
    imageSrc: string | undefined,
    imageQuarterTurns: QuarterTurn,
    useA4Container: boolean,
) {
    const [rotatedImagePreview, setRotatedImagePreview] = useState<RotatedImagePreview | null>(
        null,
    );
    const rotatedImagePreviewKey = rotatedPreviewKey(imageSrc, imageQuarterTurns, useA4Container);

    useEffect(() => {
        if (!rotatedImagePreviewKey || !imageSrc) {
            setRotatedImagePreview(null);
            return;
        }

        let active = true;
        setRotatedImagePreview((current) => pendingPreviewForKey(current, rotatedImagePreviewKey));
        void renderRotatedImage(imageSrc, imageQuarterTurns)
            .then((src) => {
                if (!active) {
                    maybeRevokeObjectUrl(src);
                    return;
                }

                setRotatedImagePreview((current) =>
                    readyPreviewForKey(current, rotatedImagePreviewKey, src),
                );
            })
            .catch(() => {
                if (active) {
                    setRotatedImagePreview((current) =>
                        failedPreviewForKey(current, rotatedImagePreviewKey),
                    );
                }
            });

        return () => {
            active = false;
            setRotatedImagePreview((current) =>
                clearedPreviewForKey(current, rotatedImagePreviewKey),
            );
        };
    }, [imageQuarterTurns, imageSrc, rotatedImagePreviewKey]);

    return previewResult(rotatedImagePreviewKey, rotatedImagePreview);
}
