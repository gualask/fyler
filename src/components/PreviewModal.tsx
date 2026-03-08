import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    ArrowUturnLeftIcon,
    ArrowUturnRightIcon,
    ArrowPathIcon,
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

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    editsByFile: Record<string, FileEdits>;
    imageFit?: ImageFit;
    onRotatePage?: (pageNum: number, direction: RotationDirection) => Promise<void>;
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

export function PreviewModal({ finalPages, files, editsByFile, imageFit = 'fit', onRotatePage, onClose }: Props) {
    const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);
    const [zoomLevel, setZoomLevel] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const [isRotating, setIsRotating] = useState(false);
    const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
    const total = finalPages.length;
    const singlePreview = total === 1 ? finalPages[0] : null;
    const canRotate = Boolean(onRotatePage && singlePreview && fileMap.get(singlePreview.fileId));

    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onClose();
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

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
        setCurrentPage(index + 1);
    }, []);

    const handleRotate = useCallback(async (direction: RotationDirection) => {
        if (!onRotatePage || !singlePreview) return;
        setIsRotating(true);
        try {
            await onRotatePage(singlePreview.pageNum, direction);
        } finally {
            setIsRotating(false);
        }
    }, [onRotatePage, singlePreview]);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="relative flex h-[88vh] w-[82vw] flex-col overflow-hidden rounded-xl bg-zinc-900 shadow-2xl"
                onClick={(event) => event.stopPropagation()}
            >
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-black/60 px-4 py-2">
                    <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                        <button
                            onClick={() => setZoomLevel((value) => Math.max(value / 1.2, ZOOM_MIN))}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                            title="Riduci (Ctrl+scroll giù)"
                        >
                            <MagnifyingGlassMinusIcon className="h-4 w-4" />
                        </button>
                        <span className="min-w-[3rem] text-center font-mono text-xs font-medium text-white/80">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            onClick={() => setZoomLevel((value) => Math.min(value * 1.2, ZOOM_MAX))}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                            title="Ingrandisci (Ctrl+scroll su)"
                        >
                            <MagnifyingGlassPlusIcon className="h-4 w-4" />
                        </button>
                        <div className="mx-1 h-4 w-px bg-white/20" />
                        <button
                            onClick={() => setZoomLevel(1)}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                            title="Ripristina zoom (100%)"
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                        </button>
                    </div>

                    <div className="flex items-center gap-2">
                        {canRotate && (
                            <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                                <button
                                    onClick={() => void handleRotate('ccw')}
                                    disabled={isRotating}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                                    title="Ruota 90° antiorario"
                                >
                                    <ArrowUturnLeftIcon className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={() => void handleRotate('cw')}
                                    disabled={isRotating}
                                    className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20 disabled:cursor-wait disabled:opacity-40"
                                    title="Ruota 90° orario"
                                >
                                    <ArrowUturnRightIcon className="h-4 w-4" />
                                </button>
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

                <div
                    ref={setScrollEl}
                    className="flex-1 overflow-y-auto px-4 pb-10 pt-14"
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

                <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-black/50 py-2">
                    <span className="text-sm font-medium text-white/80">
                        Pagina {currentPage} / {total}
                    </span>
                </div>
            </div>
        </div>
    );
}
