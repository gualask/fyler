import { useCallback, useEffect, useMemo, useState } from 'react';
import type { RotationDirection } from '@/shared/domain/file-edits';
import { emptyFileEdits } from '@/shared/domain/file-edits';
import { PageSlot } from './components/PageSlot';
import type { SlotContext } from './models/slot-model';
import { Toolbar } from './toolbar/Toolbar';
import type { PreviewModalProps } from './types';

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;
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
    const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isRotating, setIsRotating] = useState(false);
    const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
    const total = finalPages.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentPage = finalPages[currentIndex] ?? null;
    const canRotate = Boolean(onRotatePage && currentPage && fileMap.get(currentPage.fileId));
    const displayCurrentPage =
        indicator?.current ??
        (indicator?.mode === 'page-num'
            ? Math.max(currentPage?.pageNum ?? 1, 1)
            : currentIndex + 1);
    const displayTotalPages = indicator?.total ?? total;

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler, { capture: true });
        return () => window.removeEventListener('keydown', handler, { capture: true });
    }, [onClose]);

    useEffect(() => {
        setCurrentIndex((value) => Math.min(value, Math.max(total - 1, 0)));
    }, [total]);

    useEffect(() => {
        const el = scrollEl;
        if (!el) return;
        const handler = (event: WheelEvent) => {
            if (!event.ctrlKey) return;
            event.preventDefault();
            const factor = event.deltaY < 0 ? 1.1 : 1 / 1.1;
            setZoomLevel((value) => Math.min(Math.max(value * factor, ZOOM_MIN), ZOOM_MAX));
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, [scrollEl]);

    const handleVisible = useCallback((index: number) => {
        setCurrentIndex(index);
    }, []);

    const slotContext = useMemo<SlotContext>(
        () => ({
            scrollRoot: scrollEl,
            zoomLevel,
            imageFit,
            matchExportedImages,
            onVisible: handleVisible,
        }),
        [handleVisible, imageFit, matchExportedImages, scrollEl, zoomLevel],
    );

    const handleRotate = useCallback(
        async (direction: RotationDirection) => {
            if (!onRotatePage || !currentPage) return;
            setIsRotating(true);
            try {
                await onRotatePage(currentPage.fileId, currentPage.pageNum, direction);
            } finally {
                setIsRotating(false);
            }
        },
        [currentPage, onRotatePage],
    );

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="relative flex h-[88vh] w-[82vw] flex-col overflow-hidden rounded-xl bg-zinc-900 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <Toolbar
                    displayCurrentPage={displayCurrentPage}
                    displayTotalPages={displayTotalPages}
                    zoomLevel={zoomLevel}
                    canRotate={canRotate}
                    isRotating={isRotating}
                    moveControl={moveControl}
                    onZoomOut={() => setZoomLevel((value) => Math.max(value / 1.2, ZOOM_MIN))}
                    onZoomIn={() => setZoomLevel((value) => Math.min(value * 1.2, ZOOM_MAX))}
                    onZoomReset={() => setZoomLevel(1)}
                    onRotate={(direction) => void handleRotate(direction)}
                    onClose={onClose}
                />

                <div ref={setScrollEl} className="flex-1 overflow-y-auto px-4 pb-10 pt-16">
                    <div
                        className={
                            total === 1 ? 'flex min-h-full items-center justify-center' : undefined
                        }
                    >
                        {finalPages.map((fp, index) => {
                            const edits = editsByFile[fp.fileId] ?? emptyFileEdits();
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
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
