import { ArrowUturnLeftIcon, ArrowUturnRightIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import { useElementWidth } from '../hooks/useElementWidth';
import { usePdfDocument } from '../hooks/usePdfDocument';
import { usePdfRenderer } from '../hooks/usePdfRenderer';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/** Props for the PDF preview canvas component. */
interface Props {
    url: string;
    onStatus?: (status: string) => void;
    onRotate?: (pageNum: number, angle: number) => void;
}

/**
 * Renders a PDF document in a canvas with page navigation.
 * Delegates document loading to {@link usePdfDocument} and page rendering to {@link usePdfRenderer}.
 */
export function PdfPreview({ url, onStatus, onRotate }: Props) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const [viewportRef, viewportWidth] = useElementWidth();
    const { doc, pageCount, loading, error } = usePdfDocument(url, onStatus);
    const [pageNum, setPageNum] = useState(1);

    usePdfRenderer(doc, pageNum, pageCount, viewportWidth, canvasRef, onStatus);

    const canPrev = pageNum > 1;
    const canNext = pageNum < pageCount;

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-ui-border bg-ui-surface p-3">
            {/* Toolbar navigazione */}
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <button
                        disabled={!canPrev}
                        onClick={() => setPageNum((n) => Math.max(1, n - 1))}
                        className="rounded p-1 text-ui-text-dim hover:bg-ui-surface-hover disabled:opacity-30"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                        disabled={!canNext}
                        onClick={() => setPageNum((n) => Math.min(pageCount, n + 1))}
                        className="rounded p-1 text-ui-text-dim hover:bg-ui-surface-hover disabled:opacity-30"
                    >
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                    <span className="ml-1 text-sm text-ui-text-dim">
                        Pagina {pageNum} / {pageCount || '—'}
                    </span>
                </div>
                <div className="flex items-center gap-1">
                    {onRotate && (
                        <>
                            <button
                                onClick={() => onRotate(pageNum, -90)}
                                title="Ruota 90° antiorario"
                                className="rounded p-1 text-ui-text-dim hover:bg-ui-surface-hover"
                            >
                                <ArrowUturnLeftIcon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onRotate(pageNum, 90)}
                                title="Ruota 90° orario"
                                className="rounded p-1 text-ui-text-dim hover:bg-ui-surface-hover"
                            >
                                <ArrowUturnRightIcon className="h-4 w-4" />
                            </button>
                        </>
                    )}
                    <span className="text-xs text-ui-text-muted">
                        {viewportWidth ? `${viewportWidth}px` : ''}
                    </span>
                </div>
            </div>

            {/* Area canvas */}
            <div ref={viewportRef} className="min-h-0 flex-1 overflow-auto overscroll-contain">
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-ui-accent-muted border-t-transparent" />
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                ) : (
                    <div className="flex min-h-full items-center justify-center p-2">
                        <canvas ref={canvasRef} className="block max-w-full bg-white" />
                    </div>
                )}
            </div>
        </div>
    );
}
