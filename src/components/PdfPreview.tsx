import { useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useElementWidth } from '../hooks/useElementWidth';
import { usePdfDocument } from '../hooks/usePdfDocument';
import { usePdfRenderer } from '../hooks/usePdfRenderer';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

interface Props {
    url: string;
    pageNum: number;
    onPageCountChange: (n: number) => void;
    onStatus?: (status: string) => void;
    onNextPage?: () => void;
    onPrevPage?: () => void;
}

export function PdfPreview({ url, pageNum, onPageCountChange, onStatus, onNextPage, onPrevPage }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [viewportRef, viewportWidth] = useElementWidth<HTMLDivElement>();
    const { doc, pageCount, loading, error } = usePdfDocument(url, onStatus);
    const wheelCooldown = useRef(false);

    useEffect(() => {
        onPageCountChange(pageCount);
    }, [pageCount, onPageCountChange]);

    usePdfRenderer(doc, pageNum, pageCount, viewportWidth, canvasRef, onStatus);

    const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
        if (wheelCooldown.current) return;
        const el = e.currentTarget;
        const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
        const atTop = el.scrollTop <= 0;
        if (e.deltaY > 0 && atBottom && onNextPage) {
            wheelCooldown.current = true;
            setTimeout(() => { wheelCooldown.current = false; }, 600);
            onNextPage();
        } else if (e.deltaY < 0 && atTop && onPrevPage) {
            wheelCooldown.current = true;
            setTimeout(() => { wheelCooldown.current = false; }, 600);
            onPrevPage();
        }
    };

    return (
        <div ref={viewportRef} onWheel={handleWheel} className="h-full overflow-auto overscroll-contain">
            {loading ? (
                <div className="flex h-full items-center justify-center">
                    <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-accent-muted border-t-transparent" />
                </div>
            ) : error ? (
                <div className="flex h-full items-center justify-center">
                    <p className="text-sm text-red-500">{error}</p>
                </div>
            ) : (
                <div className="flex min-h-full items-center justify-center p-4">
                    <canvas ref={canvasRef} className="block max-w-full bg-white shadow-sm" />
                </div>
            )}
        </div>
    );
}
