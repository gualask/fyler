import type { ReactNode } from 'react';
import { useSlotState } from '../hooks/slot-state.hook';
import type { SlotContext, SlotPage } from '../models/slot-model';

const BASE_WIDTH = 680;

interface Props {
    page: SlotPage;
    context: SlotContext;
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

    const zoomLevel =
        typeof context.zoomLevel === 'number' &&
        Number.isFinite(context.zoomLevel) &&
        context.zoomLevel > 0
            ? context.zoomLevel
            : 1;

    const slotWidth =
        typeof pdfAspectRatio === 'number' && Number.isFinite(pdfAspectRatio) && pdfAspectRatio > 0
            ? BASE_WIDTH * Math.max(1, pdfAspectRatio) * zoomLevel
            : BASE_WIDTH * zoomLevel;

    let content: ReactNode;
    if (isImage && imageSrc) {
        if (context.matchExportedImages) {
            const needsLayoutSafeRotation = Math.abs(imageRotation) % 180 !== 0;
            if (exportMatchedImageSrc) {
                content = (
                    <img
                        src={exportMatchedImageSrc}
                        alt=""
                        draggable={false}
                        className="block h-auto w-full select-none bg-white"
                    />
                );
            } else if (isExportMatchedImagePending) {
                content = (
                    <div
                        className="flex w-full items-center justify-center bg-white"
                        style={{ aspectRatio: useA4Container ? '595/842' : '210/297' }}
                    >
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
                    </div>
                );
            } else if (
                needsLayoutSafeRotation &&
                (rotatedImagePreviewStatus === 'idle' || rotatedImagePreviewStatus === 'pending')
            ) {
                content = (
                    <div
                        className="flex w-full items-center justify-center bg-white"
                        style={{ aspectRatio: useA4Container ? '595/842' : '210/297' }}
                    >
                        <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
                    </div>
                );
            } else if (needsLayoutSafeRotation && rotatedImagePreviewStatus === 'failed') {
                content = (
                    <div
                        className="relative w-full overflow-hidden bg-white"
                        style={{ aspectRatio: '595/842' }}
                    >
                        <img
                            src={imageSrc}
                            alt=""
                            draggable={false}
                            className={[
                                'absolute inset-0 h-full w-full select-none',
                                imageFitMode === 'cover' ? 'object-cover' : 'object-contain',
                            ].join(' ')}
                            style={{ transform: `rotate(${imageRotation}deg)` }}
                        />
                    </div>
                );
            } else {
                content = (
                    <img
                        src={imageSrc}
                        alt=""
                        draggable={false}
                        className="block h-auto w-full select-none bg-white"
                        style={{ transform: `rotate(${imageRotation}deg)` }}
                    />
                );
            }
        } else if (useA4Container) {
            content = (
                <div
                    className="relative w-full overflow-hidden bg-white"
                    style={{ aspectRatio: '595/842' }}
                >
                    <img
                        src={imageSrc}
                        alt=""
                        draggable={false}
                        className={[
                            'absolute inset-0 h-full w-full select-none',
                            imageFitMode === 'cover' ? 'object-cover' : 'object-contain',
                        ].join(' ')}
                        style={{ transform: `rotate(${imageRotation}deg)` }}
                    />
                </div>
            );
        } else {
            content = (
                <img
                    src={imageSrc}
                    alt=""
                    draggable={false}
                    className="block h-auto w-full select-none bg-white"
                    style={{ transform: `rotate(${imageRotation}deg)` }}
                />
            );
        }
    } else if (pdfSrc) {
        content = (
            <img
                src={pdfSrc}
                alt=""
                draggable={false}
                className="block h-auto w-full select-none bg-white"
            />
        );
    } else {
        content = (
            <div
                className="flex w-full items-center justify-center bg-white"
                style={{ aspectRatio: '210/297' }}
            >
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-ui-accent border-t-transparent" />
            </div>
        );
    }

    return (
        <div ref={slotRef} style={{ width: slotWidth }} className="mx-auto mb-4 shadow-lg">
            {content}
        </div>
    );
}
