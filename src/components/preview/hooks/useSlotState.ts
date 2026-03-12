import { useEffect, useMemo, useRef, useState } from 'react';

import { getImageQuarterTurn, getImageRotationDegrees } from '../../../fileEdits';
import { buildPreviewRenderRequest } from '../../../pdfRenderProfiles';
import { getImageExportPreviewLayout, getPreviewUrl } from '../../../platform';
import { renderExportMatchedImage, renderRotatedImage } from '../utils/renderImage';
import type { SlotContext, SlotPage } from '../models/slotModel';
import { usePdfCache } from '../../../hooks/usePdfCache';

export function useSlotState(page: SlotPage, context: SlotContext) {
    const slotRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);
    const [exportMatchedImage, setExportMatchedImage] = useState<{ key: string; src: string } | null>(null);
    const [rotatedImagePreview, setRotatedImagePreview] = useState<{ key: string; src: string } | null>(null);
    const { requestRenders, getRender } = usePdfCache();
    const { fp, file, edits, index } = page;
    const { scrollRoot, imageFit, matchExportedImages, onVisible } = context;

    const isImage = file?.kind === 'image';
    const imageQuarterTurns = getImageQuarterTurn(edits);
    const imageRotation = getImageRotationDegrees(edits);
    const useA4Container = isImage && (imageFit === 'contain' || imageFit === 'cover');
    const previewRequest = useMemo(
        () => (file?.kind === 'pdf' ? buildPreviewRenderRequest(fp.pageNum, edits) : null),
        [edits, file?.kind, fp.pageNum],
    );
    const pdfSrc = file && previewRequest ? getRender(file.id, previewRequest) : undefined;
    const imageOriginalPath = file?.originalPath;
    const imageSrc = file?.kind === 'image' ? getPreviewUrl(file.originalPath) : undefined;
    const rotatedImagePreviewKey = imageSrc && !useA4Container && imageQuarterTurns !== 0
        ? `${imageSrc}:${imageQuarterTurns}`
        : null;
    const exportPreviewKey = matchExportedImages && imageSrc && imageOriginalPath
        ? `${imageOriginalPath}:${imageFit}:${imageQuarterTurns}`
        : null;
    const exportMatchedImageSrc = exportMatchedImage?.key === exportPreviewKey ? exportMatchedImage.src : null;
    const rotatedImagePreviewSrc = rotatedImagePreview?.key === rotatedImagePreviewKey ? rotatedImagePreview.src : null;

    useEffect(() => {
        if (!slotRef.current || !scrollRoot) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldRender(true);
                }
            },
            { root: scrollRoot, rootMargin: '300px' },
        );
        observer.observe(slotRef.current);
        return () => observer.disconnect();
    }, [scrollRoot]);

    useEffect(() => {
        if (!slotRef.current || !scrollRoot) return;
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) onVisible(index);
            },
            { root: scrollRoot, threshold: 0.3 },
        );
        observer.observe(slotRef.current);
        return () => observer.disconnect();
    }, [index, onVisible, scrollRoot]);

    useEffect(() => {
        if (!shouldRender || !file || !previewRequest) return;
        requestRenders(file, [previewRequest]);
    }, [file, previewRequest, requestRenders, shouldRender]);

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
                    setRotatedImagePreview((current) => (current?.key === rotatedImagePreviewKey ? null : current));
                }
            });

        return () => {
            active = false;
        };
    }, [imageQuarterTurns, imageSrc, rotatedImagePreviewKey]);

    useEffect(() => {
        if (!exportPreviewKey || !imageSrc || !imageOriginalPath) {
            return;
        }

        let active = true;
        void getImageExportPreviewLayout(imageOriginalPath, imageFit, imageQuarterTurns)
            .then((layout) => renderExportMatchedImage(imageSrc, layout, imageQuarterTurns))
            .then((src) => {
                if (active) {
                    setExportMatchedImage({ key: exportPreviewKey, src });
                }
            })
            .catch(() => {
                if (active) {
                    setExportMatchedImage((current) => (current?.key === exportPreviewKey ? null : current));
                }
            });

        return () => {
            active = false;
        };
    }, [exportPreviewKey, imageFit, imageOriginalPath, imageQuarterTurns, imageSrc]);

    return {
        slotRef,
        isImage,
        imageSrc: rotatedImagePreviewSrc ?? imageSrc,
        imageRotation: rotatedImagePreviewSrc ? 0 : imageRotation,
        pdfSrc,
        useA4Container,
        imageFitMode: imageFit === 'cover' ? 'cover' : 'contain',
        exportMatchedImageSrc,
        isExportMatchedImagePending: Boolean(exportPreviewKey) && !exportMatchedImageSrc,
    };
}
