import { motion } from 'motion/react';
import {
    type ReactNode,
    type RefObject,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';
import type { FileEdits, FinalPage, RotationDirection, SourceFile } from '@/shared/domain';
import { finalPageToTarget } from '@/shared/domain/utils/final-page-id';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { useTranslation } from '@/shared/i18n';
import { useModalFocus } from '@/shared/ui';
import { usePreviewZoom } from './hooks/preview-zoom.hook';
import { PageSlot } from './page-slot/PageSlot';
import type { PageIndicator, PreviewModalProps } from './preview.types';
import type { SlotContext } from './slot.types';
import { Toolbar } from './toolbar/Toolbar';

type FileMap = Map<string, SourceFile>;

type PreviewFrameProps = {
    dialogRef: RefObject<HTMLDivElement | null>;
    label: string;
    onClose: () => void;
    children: ReactNode;
};

type PreviewSlotsProps = {
    finalPages: FinalPage[];
    fileMap: FileMap;
    editsByFile: Record<string, FileEdits>;
    slotContext: SlotContext;
};

type PreviewScrollAreaProps = PreviewSlotsProps & {
    setScrollEl: (element: HTMLElement | null) => void;
};

type PreviewSlotContextOptions = {
    scrollEl: HTMLElement | null;
    zoomLevel: number;
    imageFit: NonNullable<PreviewModalProps['imageFit']>;
    matchExportedImages: boolean;
    onVisible: (index: number) => void;
};

function useFileMap(files: SourceFile[]): FileMap {
    return useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);
}

function useCurrentPreviewPage(finalPages: FinalPage[]) {
    const [currentIndex, setCurrentIndex] = useState(0);
    const total = finalPages.length;

    useEffect(() => {
        setCurrentIndex((value) => Math.min(value, Math.max(total - 1, 0)));
    }, [total]);

    const handleVisible = useCallback((index: number) => {
        setCurrentIndex(index);
    }, []);

    return {
        currentIndex,
        currentPage: finalPages[currentIndex] ?? null,
        handleVisible,
        total,
    };
}

function usePreviewSlotContext({
    scrollEl,
    zoomLevel,
    imageFit,
    matchExportedImages,
    onVisible,
}: PreviewSlotContextOptions): SlotContext {
    return useMemo(
        () => ({
            scrollRoot: scrollEl,
            zoomLevel,
            imageFit,
            matchExportedImages,
            onVisible,
        }),
        [imageFit, matchExportedImages, onVisible, scrollEl, zoomLevel],
    );
}

function usePreviewRotation(
    currentPage: FinalPage | null,
    onRotatePage: PreviewModalProps['onRotatePage'],
) {
    const [isRotating, setIsRotating] = useState(false);
    const handleRotate = useCallback(
        async (direction: RotationDirection) => {
            if (!onRotatePage || !currentPage) return;

            setIsRotating(true);
            try {
                await onRotatePage(currentPage.fileId, finalPageToTarget(currentPage), direction);
            } finally {
                setIsRotating(false);
            }
        },
        [currentPage, onRotatePage],
    );

    return { isRotating, handleRotate };
}

function previewCurrentPage(
    indicator: PageIndicator | undefined,
    currentPage: FinalPage | null,
    currentIndex: number,
): number {
    if (indicator?.current !== undefined) return indicator.current;
    if (indicator?.mode !== 'page-num') return currentIndex + 1;
    if (currentPage?.kind !== 'pdf') return 1;

    return Math.max(currentPage.pageNum, 1);
}

function canRotateCurrentPage(
    currentPage: FinalPage | null,
    fileMap: FileMap,
    onRotatePage: PreviewModalProps['onRotatePage'],
): boolean {
    return Boolean(onRotatePage && currentPage && fileMap.get(currentPage.fileId));
}

function PreviewFrame({ dialogRef, label, onClose, children }: PreviewFrameProps) {
    return (
        <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
        >
            <motion.div
                ref={dialogRef}
                role="dialog"
                aria-modal="true"
                aria-label={label}
                tabIndex={-1}
                className="relative flex h-[88vh] w-[82vw] flex-col overflow-hidden rounded-xl bg-zinc-900 shadow-2xl"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                onClick={(event) => event.stopPropagation()}
            >
                {children}
            </motion.div>
        </motion.div>
    );
}

function PreviewSlots({ finalPages, fileMap, editsByFile, slotContext }: PreviewSlotsProps) {
    const slots = finalPages.map((fp, index) => {
        const edits = editsByFile[fp.fileId] ?? FileEditsVO.empty();

        return (
            <PageSlot
                key={fp.id}
                page={{
                    fp,
                    file: fileMap.get(fp.fileId),
                    edits,
                    index,
                }}
                context={slotContext}
            />
        );
    });

    if (finalPages.length === 1) {
        return <div className="flex min-h-full items-center justify-center">{slots}</div>;
    }

    return <>{slots}</>;
}

function PreviewScrollArea({
    finalPages,
    fileMap,
    editsByFile,
    slotContext,
    setScrollEl,
}: PreviewScrollAreaProps) {
    return (
        <div ref={setScrollEl} className="flex-1 overflow-y-auto px-4 pb-10 pt-20">
            <PreviewSlots
                finalPages={finalPages}
                fileMap={fileMap}
                editsByFile={editsByFile}
                slotContext={slotContext}
            />
        </div>
    );
}

export function PreviewModal({
    finalPages,
    files,
    editsByFile,
    imageFit = 'fit',
    matchExportedImages = false,
    indicator,
    moveControl,
    onRotatePage,
    onClose,
}: PreviewModalProps) {
    const { t } = useTranslation();
    const fileMap = useFileMap(files);
    const dialogRef = useRef<HTMLDivElement | null>(null);

    useModalFocus({
        containerRef: dialogRef,
        onEscape: onClose,
    });

    const { currentIndex, currentPage, handleVisible, total } = useCurrentPreviewPage(finalPages);
    const { zoomLevel, scrollEl, setScrollEl, zoomOut, zoomIn, zoomReset } = usePreviewZoom();
    const { isRotating, handleRotate } = usePreviewRotation(currentPage, onRotatePage);
    const slotContext = usePreviewSlotContext({
        scrollEl,
        zoomLevel,
        imageFit,
        matchExportedImages,
        onVisible: handleVisible,
    });
    const displayCurrentPage = previewCurrentPage(indicator, currentPage, currentIndex);
    const displayTotalPages = indicator?.total ?? total;
    const canRotate = canRotateCurrentPage(currentPage, fileMap, onRotatePage);

    return (
        <PreviewFrame dialogRef={dialogRef} label={t('header.preview')} onClose={onClose}>
            <Toolbar
                displayCurrentPage={displayCurrentPage}
                displayTotalPages={displayTotalPages}
                zoomLevel={zoomLevel}
                canRotate={canRotate}
                isRotating={isRotating}
                moveControl={moveControl}
                onZoomOut={zoomOut}
                onZoomIn={zoomIn}
                onZoomReset={zoomReset}
                onRotate={(direction) => void handleRotate(direction)}
                onClose={onClose}
            />

            <PreviewScrollArea
                finalPages={finalPages}
                fileMap={fileMap}
                editsByFile={editsByFile}
                slotContext={slotContext}
                setScrollEl={setScrollEl}
            />
        </PreviewFrame>
    );
}
