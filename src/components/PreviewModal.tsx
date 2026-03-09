import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    ChevronDownIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';

import type { FileEdits, FinalPage, ImageFit, SourceFile } from '../domain';
import type { RotationDirection } from '../fileEdits';
import { emptyFileEdits, getImageRotationDegrees } from '../fileEdits';
import { usePdfCache } from '../hooks/usePdfCache';
import { buildPreviewRenderRequest } from '../pdfRenderProfiles';
import { getPreviewUrl } from '../platform';

const BASE_WIDTH = 680;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

type PageIndicator = {
    current?: number;
    total?: number;
    mode?: 'index' | 'page-num';
};

type MoveControl = {
    currentPosition: number;
    totalPositions: number;
    onMoveToPosition: (targetIndex: number) => void;
};

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
    imageFit?: ImageFit;
    indicator?: PageIndicator;
    moveControl?: MoveControl;
    onRotatePage?: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    onClose: () => void;
}

interface PageSlotProps {
    fp: FinalPage;
    file: SourceFile | undefined;
    edits: FileEdits;
    index: number;
    scrollRoot: HTMLElement | null;
    zoomLevel: number;
    imageFit: ImageFit;
    onVisible: (index: number) => void;
}

interface PreviewToolbarProps {
    displayCurrentPage: number;
    displayTotalPages: number;
    zoomLevel: number;
    canRotate: boolean;
    isRotating: boolean;
    moveControl?: MoveControl;
    onZoomOut: () => void;
    onZoomIn: () => void;
    onZoomReset: () => void;
    onRotate: (direction: RotationDirection) => void;
    onClose: () => void;
}

function PageSlot({ fp, file, edits, index, scrollRoot, zoomLevel, imageFit, onVisible }: PageSlotProps) {
    const slotRef = useRef<HTMLDivElement>(null);
    const [shouldRender, setShouldRender] = useState(false);
    const { requestRenders, getRender } = usePdfCache();

    const isImage = file?.kind === 'image';
    const useA4Container = isImage && (imageFit === 'contain' || imageFit === 'cover');
    const imageRotation = getImageRotationDegrees(edits);
    const previewRequest = useMemo(
        () => (file?.kind === 'pdf' ? buildPreviewRenderRequest(fp.pageNum, edits) : null),
        [edits, file?.kind, fp.pageNum],
    );
    const pdfSrc = file && previewRequest ? getRender(file.id, previewRequest) : undefined;
    const imageSrc = file?.kind === 'image' ? getPreviewUrl(file.originalPath) : undefined;

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

    return (
        <div
            ref={slotRef}
            style={{ width: BASE_WIDTH * zoomLevel }}
            className="mx-auto mb-4 shadow-lg"
        >
            {isImage && imageSrc ? (
                useA4Container ? (
                    <div
                        className="relative w-full overflow-hidden bg-white"
                        style={{ aspectRatio: '595/842' }}
                    >
                        <img
                            src={imageSrc}
                            draggable={false}
                            className={[
                                'absolute inset-0 h-full w-full select-none',
                                imageFit === 'cover' ? 'object-cover' : 'object-contain',
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

function PreviewToolbar({
    displayCurrentPage,
    displayTotalPages,
    zoomLevel,
    canRotate,
    isRotating,
    moveControl,
    onZoomOut,
    onZoomIn,
    onZoomReset,
    onRotate,
    onClose,
}: PreviewToolbarProps) {
    const [moveToValue, setMoveToValue] = useState('');
    const showMoveTo = Boolean(moveControl && moveControl.totalPositions > 1);
    const moveOptions = moveControl
        ? Array.from({ length: moveControl.totalPositions }, (_, index) => index + 1)
        : [];

    const handleMoveToChange = useCallback((target: string) => {
        setMoveToValue(target);
        const targetIndex = Number.parseInt(target, 10) - 1;
        if (!moveControl || Number.isNaN(targetIndex) || targetIndex < 0 || targetIndex >= moveControl.totalPositions) {
            setMoveToValue('');
            return;
        }
        moveControl.onMoveToPosition(targetIndex);
        setMoveToValue('');
    }, [moveControl]);

    return (
        <div className="absolute inset-x-0 top-0 z-10 grid grid-cols-[1fr_auto_1fr] items-center gap-3 bg-black/60 px-4 py-2">
            <div className="justify-self-start">
                <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                    <button
                        onClick={onZoomOut}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                        title="Riduci (Ctrl+scroll giù)"
                    >
                        <MagnifyingGlassMinusIcon className="h-4 w-4" />
                    </button>
                    <span className="min-w-[3rem] text-center font-mono text-xs font-medium text-white/80">
                        {Math.round(zoomLevel * 100)}%
                    </span>
                    <button
                        onClick={onZoomIn}
                        className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                        title="Ingrandisci (Ctrl+scroll su)"
                    >
                        <MagnifyingGlassPlusIcon className="h-4 w-4" />
                    </button>
                    <button
                        onClick={onZoomReset}
                        className="rounded-md px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-white/20"
                        title="Ripristina zoom (100%)"
                    >
                        Reset
                    </button>
                </div>
            </div>

            <div className="justify-self-center text-sm font-medium text-white/85">
                Page {displayCurrentPage} / {displayTotalPages}
            </div>

            <div className="flex items-center gap-2 justify-self-end">
                {canRotate && (
                    <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                        <button
                            onClick={() => onRotate('ccw')}
                            disabled={isRotating}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                            title="Ruota 90° antiorario"
                        >
                            <ArrowUturnLeftIcon className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => onRotate('cw')}
                            disabled={isRotating}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                            title="Ruota 90° orario"
                        >
                            <ArrowUturnRightIcon className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {showMoveTo && (
                    <div className="relative rounded-lg bg-white/10 text-white">
                        <select
                            value={moveToValue}
                            onChange={(event) => handleMoveToChange(event.target.value)}
                            className="h-9 appearance-none rounded-lg bg-transparent py-1 pl-3 pr-9 text-sm outline-none"
                            title="Sposta la pagina in un'altra posizione"
                        >
                            <option value="" className="text-slate-900">Move to</option>
                            {moveOptions.map((position) => (
                                <option
                                    key={position}
                                    value={position}
                                    disabled={position === moveControl?.currentPosition}
                                    className="text-slate-900"
                                >
                                    Move to {position}
                                </option>
                            ))}
                        </select>
                        <ChevronDownIcon className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-white/75" />
                    </div>
                )}

                <button
                    onClick={onClose}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                    title="Chiudi (Esc)"
                >
                    <XMarkIcon className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
}

export function PreviewModal({
    finalPages,
    files,
    editsByFile,
    imageFit = 'fit',
    indicator,
    moveControl,
    onRotatePage,
    onClose,
}: Props) {
    const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [isRotating, setIsRotating] = useState(false);
    const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
    const total = finalPages.length;
    const [currentIndex, setCurrentIndex] = useState(0);
    const currentPage = finalPages[currentIndex] ?? null;
    const canRotate = Boolean(onRotatePage && currentPage && fileMap.get(currentPage.fileId));
    const displayCurrentPage = indicator?.current ?? (indicator?.mode === 'page-num'
        ? Math.max(currentPage?.pageNum ?? 1, 1)
        : currentIndex + 1);
    const displayTotalPages = indicator?.total ?? total;

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
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

    const handleRotate = useCallback(async (direction: RotationDirection) => {
        if (!onRotatePage || !currentPage) return;
        setIsRotating(true);
        try {
            await onRotatePage(currentPage.fileId, currentPage.pageNum, direction);
        } finally {
            setIsRotating(false);
        }
    }, [currentPage, onRotatePage]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="relative flex h-[88vh] w-[82vw] flex-col overflow-hidden rounded-xl bg-zinc-900 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <PreviewToolbar
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

                <div
                    ref={setScrollEl}
                    className="flex-1 overflow-y-auto px-4 pb-10 pt-16"
                >
                    <div className={total === 1 ? 'flex min-h-full items-center justify-center' : undefined}>
                        {finalPages.map((fp, index) => (
                            <PageSlot
                                key={`${fp.id}:${(editsByFile[fp.fileId] ?? emptyFileEdits()).revision}`}
                                fp={fp}
                                file={fileMap.get(fp.fileId)}
                                edits={editsByFile[fp.fileId] ?? emptyFileEdits()}
                                index={index}
                                scrollRoot={scrollEl}
                                zoomLevel={zoomLevel}
                                imageFit={imageFit}
                                onVisible={handleVisible}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
