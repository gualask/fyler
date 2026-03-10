import { useSlotState } from '../hooks/useSlotState';
import type { SlotContext, SlotPage } from '../models/slotModel';

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
        pdfSrc,
        useA4Container,
        imageFitMode,
        exportMatchedImageSrc,
        isExportMatchedImagePending,
    } = useSlotState(page, context);

    return (
        <div
            ref={slotRef}
            style={{ width: BASE_WIDTH * context.zoomLevel }}
            className="mx-auto mb-4 shadow-lg"
        >
            {isImage && imageSrc ? (
                context.matchExportedImages ? (
                    exportMatchedImageSrc ? (
                        <img
                            src={exportMatchedImageSrc}
                            draggable={false}
                            className="block h-auto w-full select-none bg-white"
                        />
                    ) : isExportMatchedImagePending ? (
                        <div className="flex w-full items-center justify-center bg-white" style={{ aspectRatio: useA4Container ? '595/842' : '210/297' }}>
                            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                        </div>
                    ) : null
                ) : useA4Container ? (
                    <div
                        className="relative w-full overflow-hidden bg-white"
                        style={{ aspectRatio: '595/842' }}
                    >
                        <img
                            src={imageSrc}
                            draggable={false}
                            className={[
                                'absolute inset-0 h-full w-full select-none',
                                imageFitMode === 'cover' ? 'object-cover' : 'object-contain',
                            ].join(' ')}
                            style={{ transform: `rotate(${imageRotation}deg)` }}
                        />
                    </div>
                ) : (
                    <img
                        src={imageSrc}
                        draggable={false}
                        className="block h-auto w-full select-none bg-white"
                        style={{ transform: `rotate(${imageRotation}deg)` }}
                    />
                )
            ) : pdfSrc ? (
                <img
                    src={pdfSrc}
                    draggable={false}
                    className="block h-auto w-full select-none bg-white"
                />
            ) : (
                <div className="flex w-full items-center justify-center bg-white" style={{ aspectRatio: '210/297' }}>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
            )}
        </div>
    );
}
