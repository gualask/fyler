import { type RefObject, useEffect, useRef } from 'react';
import type * as pdfjsLib from 'pdfjs-dist';

/**
 * Renders a single PDF page onto a canvas element.
 * Handles render-task cancellation on re-render and sequential render tracking
 * to discard stale results.
 */
export function usePdfRenderer(
    doc: pdfjsLib.PDFDocumentProxy | null,
    pageNum: number,
    pageCount: number,
    viewportWidth: number,
    canvasRef: RefObject<HTMLCanvasElement | null>,
    onStatus?: (s: string) => void,
) {
    const renderTaskRef = useRef<{ cancel?: () => void } | null>(null);
    const renderSeqRef = useRef(0);

    useEffect(() => {
        if (!doc || !canvasRef.current || !viewportWidth) {
            if (!viewportWidth) onStatus?.('In attesa dimensioni area anteprima…');
            return;
        }

        let cancelled = false;
        const seq = ++renderSeqRef.current;

        (async () => {
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel?.();
                } catch {
                    /* ignore */
                }
                renderTaskRef.current = null;
            }

            onStatus?.(`Render pagina ${pageNum}/${pageCount || '?'}…`);
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

            onStatus?.(`Render completato (pagina ${pageNum})`);
        })()
            .catch((e: unknown) => {
                if (cancelled) return;
                if (e instanceof Error && e.name === 'RenderingCancelledException') return;
                onStatus?.(`Errore render: ${e instanceof Error ? e.message : String(e)}`);
            })
            .finally(() => {
                if (renderSeqRef.current === seq) renderTaskRef.current = null;
            });

        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel?.();
                } catch {
                    /* ignore */
                }
            }
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [doc, pageNum, pageCount, viewportWidth]);
}
