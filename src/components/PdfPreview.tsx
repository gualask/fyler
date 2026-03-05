import { ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useEffect, useMemo, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export function PdfPreview(props: { url: string; onStatus?: (status: string) => void }) {
    const canvasRef = useRef<HTMLCanvasElement | null>(null);
    const renderTaskRef = useRef<any>(null);
    const renderSeqRef = useRef(0);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [pageCount, setPageCount] = useState(0);
    const [pageNum, setPageNum] = useState(1);
    const [doc, setDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);

    const [viewportEl, setViewportEl] = useState<HTMLDivElement | null>(null);
    const [viewportWidth, setViewportWidth] = useState(0);

    const setStatus = (s: string) => {
        props.onStatus?.(s);
    };

    useEffect(() => {
        if (!viewportEl) return;
        const update = () => setViewportWidth(viewportEl.clientWidth);
        update();
        const ro = new ResizeObserver(update);
        ro.observe(viewportEl);
        return () => ro.disconnect();
    }, [viewportEl]);

    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        setDoc(null);
        setPageNum(1);
        setPageCount(0);
        setStatus('Caricamento PDF…');

        (async () => {
            setStatus('Download/lettura…');
            const task = pdfjsLib.getDocument({ url: props.url } as any);
            const loaded = await task.promise;
            if (cancelled) {
                await loaded.destroy();
                return;
            }
            setDoc(loaded);
            setPageCount(loaded.numPages);
            setStatus(`PDF caricato (${loaded.numPages} pagine)`);
        })()
            .catch((e: any) => {
                if (cancelled) return;
                const msg = e?.message ?? String(e);
                setError(msg);
                setStatus(`Errore: ${msg}`);
            })
            .finally(() => {
                if (cancelled) return;
                setLoading(false);
            });

        return () => { cancelled = true; };
    }, [props.url]);

    const canPrev = pageNum > 1;
    const canNext = pageNum < pageCount;
    const renderKey = useMemo(() => `${pageNum}:${viewportWidth}`, [pageNum, viewportWidth]);

    useEffect(() => {
        if (!doc || !canvasRef.current || !viewportWidth) {
            if (!viewportWidth) setStatus('In attesa dimensioni area anteprima…');
            return;
        }

        let cancelled = false;
        const seq = ++renderSeqRef.current;

        (async () => {
            if (renderTaskRef.current) {
                try { renderTaskRef.current.cancel?.(); } catch { /* ignore */ }
                renderTaskRef.current = null;
            }

            setStatus(`Render pagina ${pageNum}/${pageCount || '?'}…`);
            const page = await doc.getPage(pageNum);
            if (cancelled) return;

            const viewportAtScale1 = page.getViewport({ scale: 1 });
            const scale = Math.max(0.25, (viewportWidth - 8) / viewportAtScale1.width);
            const viewport = page.getViewport({ scale });

            const canvas = canvasRef.current!;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Impossibile ottenere il contesto canvas 2D');

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            context.setTransform(1, 0, 0, 1, 0, 0);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            const renderTask = page.render({ canvasContext: context, viewport, canvas });
            renderTaskRef.current = renderTask;
            await renderTask.promise;
            if (cancelled || renderSeqRef.current !== seq) return;

            setStatus(`Render completato (pagina ${pageNum})`);
        })()
            .catch((e: any) => {
                if (cancelled) return;
                if (e?.name === 'RenderingCancelledException') return;
                const msg = e?.message ?? String(e);
                setError(msg);
                setStatus(`Errore render: ${msg}`);
            })
            .finally(() => {
                if (renderSeqRef.current === seq) renderTaskRef.current = null;
            });

        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                try { renderTaskRef.current.cancel?.(); } catch { /* ignore */ }
            }
        };
    }, [doc, pageNum, pageCount, renderKey, viewportWidth]);

    useEffect(() => {
        return () => { if (doc) void doc.destroy(); };
    }, [doc]);

    return (
        <div className="flex h-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white p-3">
            {/* Toolbar navigazione */}
            <div className="mb-2 flex items-center justify-between">
                <div className="flex items-center gap-1">
                    <button
                        disabled={!canPrev}
                        onClick={() => setPageNum((n) => Math.max(1, n - 1))}
                        className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    >
                        <ChevronLeftIcon className="h-4 w-4" />
                    </button>
                    <button
                        disabled={!canNext}
                        onClick={() => setPageNum((n) => Math.min(pageCount, n + 1))}
                        className="rounded p-1 text-gray-600 hover:bg-gray-100 disabled:opacity-30"
                    >
                        <ChevronRightIcon className="h-4 w-4" />
                    </button>
                    <span className="ml-1 text-sm text-gray-600">
                        Pagina {pageNum} / {pageCount || '—'}
                    </span>
                </div>
                <span className="text-xs text-gray-400">
                    {viewportWidth ? `${viewportWidth}px` : ''}
                </span>
            </div>

            {/* Area canvas */}
            <div
                ref={setViewportEl}
                className="min-h-0 flex-1 overflow-auto overscroll-contain"
            >
                {loading ? (
                    <div className="flex h-full items-center justify-center">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                    </div>
                ) : error ? (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-red-500">{error}</p>
                    </div>
                ) : (
                    <div className="flex min-h-full items-center justify-center p-2">
                        <canvas
                            ref={canvasRef}
                            className="block max-w-full bg-white"
                        />
                    </div>
                )}
            </div>
        </div>
    );
}
