import { useCallback, useEffect, useRef, useState } from 'react';
import {
    ArrowPathIcon,
    MagnifyingGlassMinusIcon,
    MagnifyingGlassPlusIcon,
    XMarkIcon,
} from '@heroicons/react/24/outline';
import type { SourceFile, FinalPage, ImageFit } from '../domain';
import { useThumbnailCache } from '../hooks/useThumbnailCache';
import { getPreviewUrl } from '../platform';

const BASE_WIDTH = 680;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3;

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    imageFit?: ImageFit;
    onClose: () => void;
}

interface PageSlotProps {
    fp: FinalPage;
    file: SourceFile | undefined;
    index: number;
    scrollRoot: HTMLElement | null;
    zoomLevel: number;
    imageFit: ImageFit;
    onVisible: (index: number) => void;
}

function PageSlot({ fp, file, index, scrollRoot, zoomLevel, imageFit, onVisible }: PageSlotProps) {
    const slotRef = useRef<HTMLDivElement>(null);
    const [src, setSrc] = useState<string | null>(null);
    const { renderPageLarge } = useThumbnailCache();

    // Lazy load: carica quando entra nel viewport (con 300px di anticipo)
    useEffect(() => {
        const el = slotRef.current;
        if (!el || !file) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (!e.isIntersecting) return;
                io.disconnect();
                if (file.kind === 'image') {
                    setSrc(getPreviewUrl(file.path));
                } else {
                    void renderPageLarge(getPreviewUrl(file.path), fp.pageNum).then(setSrc);
                }
            },
            { rootMargin: '300px' },
        );
        io.observe(el);
        return () => io.disconnect();
    }, [file?.id, fp.pageNum]); // eslint-disable-line react-hooks/exhaustive-deps

    // Tracking pagina corrente: notifica quando ≥30% visibile nello scroll area
    useEffect(() => {
        if (!scrollRoot || !slotRef.current) return;
        const io = new IntersectionObserver(
            ([e]) => {
                if (e.isIntersecting) onVisible(index);
            },
            { root: scrollRoot, threshold: 0.3 },
        );
        io.observe(slotRef.current);
        return () => io.disconnect();
    }, [scrollRoot, index, onVisible]);

    // Per le immagini, il contenitore simula visivamente la modalità scelta
    const isImage = file?.kind === 'image';
    const useA4Container = isImage && (imageFit === 'contain' || imageFit === 'cover');

    return (
        <div
            ref={slotRef}
            style={{ width: BASE_WIDTH * zoomLevel }}
            className="mx-auto mb-4 shadow-lg"
        >
            {src ? (
                useA4Container ? (
                    <div
                        className="relative w-full overflow-hidden bg-white"
                        style={{ aspectRatio: '595/842' }}
                    >
                        <img
                            src={src}
                            draggable={false}
                            className={[
                                'absolute inset-0 h-full w-full select-none',
                                imageFit === 'cover' ? 'object-cover' : 'object-contain',
                            ].join(' ')}
                        />
                    </div>
                ) : (
                    <img
                        src={src}
                        draggable={false}
                        className="block h-auto w-full select-none bg-white"
                    />
                )
            ) : (
                <div className="flex w-full items-center justify-center bg-white" style={{ aspectRatio: '210/297' }}>
                    <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
                </div>
            )}
        </div>
    );
}

export function FinalPreviewModal({ finalPages, files, imageFit = 'fit', onClose }: Props) {
    const fileMap = new Map(files.map((f) => [f.id, f]));
    const [zoomLevel, setZoomLevel] = useState(1);
    const [currentPage, setCurrentPage] = useState(1);
    const scrollRef = useRef<HTMLDivElement>(null);
    const total = finalPages.length;

    // Escape chiude il modal
    useEffect(() => {
        const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [onClose]);

    // Ctrl+scroll → zoom, scroll normale → passa attraverso (nativo)
    useEffect(() => {
        const el = scrollRef.current;
        if (!el) return;
        const handler = (e: WheelEvent) => {
            if (!e.ctrlKey) return;
            e.preventDefault();
            const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
            setZoomLevel((z) => Math.min(Math.max(z * factor, ZOOM_MIN), ZOOM_MAX));
        };
        el.addEventListener('wheel', handler, { passive: false });
        return () => el.removeEventListener('wheel', handler);
    }, []);

    const handleVisible = useCallback((index: number) => {
        setCurrentPage(index + 1);
    }, []);

    const zoomIn = () => setZoomLevel((z) => Math.min(z * 1.2, ZOOM_MAX));
    const zoomOut = () => setZoomLevel((z) => Math.max(z / 1.2, ZOOM_MIN));
    const resetZoom = () => setZoomLevel(1);

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-[2px]"
            onClick={onClose}
        >
            <div
                className="relative flex h-[88vh] w-[82vw] flex-col overflow-hidden rounded-xl shadow-2xl bg-zinc-900"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Toolbar fissa top */}
                <div className="absolute inset-x-0 top-0 z-10 flex items-center justify-between bg-black/60 px-4 py-2">
                    {/* Zoom controls */}
                    <div className="flex items-center gap-1 rounded-lg bg-white/10 p-1">
                        <button
                            onClick={zoomOut}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                            title="Riduci (Ctrl+scroll giù)"
                        >
                            <MagnifyingGlassMinusIcon className="h-4 w-4" />
                        </button>
                        <span className="min-w-[3rem] text-center font-mono text-xs font-medium text-white/80">
                            {Math.round(zoomLevel * 100)}%
                        </span>
                        <button
                            onClick={zoomIn}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                            title="Ingrandisci (Ctrl+scroll su)"
                        >
                            <MagnifyingGlassPlusIcon className="h-4 w-4" />
                        </button>
                        <div className="mx-1 h-4 w-px bg-white/20" />
                        <button
                            onClick={resetZoom}
                            className="flex h-7 w-7 items-center justify-center rounded-md text-white transition-colors hover:bg-white/20"
                            title="Ripristina zoom (100%)"
                        >
                            <ArrowPathIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Chiudi */}
                    <button
                        onClick={onClose}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
                        title="Chiudi (Esc)"
                    >
                        <XMarkIcon className="h-5 w-5" />
                    </button>
                </div>

                {/* Area di scroll */}
                <div
                    ref={scrollRef}
                    className="flex-1 overflow-y-auto pt-14 pb-10 px-4"
                >
                    <div className={total === 1 ? 'flex min-h-full items-center justify-center' : undefined}>
                        {finalPages.map((fp, i) => (
                            <PageSlot
                                key={fp.id}
                                fp={fp}
                                file={fileMap.get(fp.fileId)}
                                index={i}
                                scrollRoot={scrollRef.current}
                                zoomLevel={zoomLevel}
                                imageFit={imageFit}
                                onVisible={handleVisible}
                            />
                        ))}
                    </div>
                </div>

                {/* Status bar fissa bottom */}
                <div className="absolute inset-x-0 bottom-0 z-10 flex justify-center bg-black/50 py-2">
                    <span className="text-sm font-medium text-white/80">
                        Pagina {currentPage} / {total}
                    </span>
                </div>
            </div>
        </div>
    );
}
