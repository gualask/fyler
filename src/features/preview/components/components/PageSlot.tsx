import { useSlotState } from '../hooks/slot-state.hook';
import type { SlotContext, SlotPage } from '../models/slot-model';
import { renderSlotContent } from './PageSlot.render';

const BASE_WIDTH = 680;

interface Props {
    page: SlotPage;
    context: SlotContext;
}

function resolveZoomLevel(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : 1;
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
