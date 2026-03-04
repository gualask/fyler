import {ActionIcon, Center, Group, Loader, Paper, Text} from '@mantine/core';
import {IconChevronLeft, IconChevronRight} from '@tabler/icons-react';
import {useEffect, useMemo, useRef, useState} from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

export function PdfPreview(props: {url: string; onStatus?: (status: string) => void}) {
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
        // Useful when running `wails dev` with devtools.
        // eslint-disable-next-line no-console
        console.debug(`[preview] ${s}`);
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
            const task = pdfjsLib.getDocument({url: props.url} as any);
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

        return () => {
            cancelled = true;
        };
    }, [props.url]);

    const canPrev = pageNum > 1;
    const canNext = pageNum < pageCount;

    const renderKey = useMemo(() => `${pageNum}:${viewportWidth}`, [pageNum, viewportWidth]);

    useEffect(() => {
        if (!doc) return;
        if (!canvasRef.current) return;

        if (!viewportWidth) {
            setStatus('In attesa dimensioni area anteprima…');
            return;
        }

        let cancelled = false;
        const seq = ++renderSeqRef.current;

        (async () => {
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel?.();
                } catch {
                    // Ignore cancellation errors.
                } finally {
                    renderTaskRef.current = null;
                }
            }

            setStatus(`Render pagina ${pageNum}/${pageCount || '?'}…`);
            const page = await doc.getPage(pageNum);
            if (cancelled) return;

            const viewportAtScale1 = page.getViewport({scale: 1});
            const scale = Math.max(0.25, (viewportWidth - 8) / viewportAtScale1.width);
            const viewport = page.getViewport({scale});

            const canvas = canvasRef.current!;
            const context = canvas.getContext('2d');
            if (!context) throw new Error('Impossibile ottenere il contesto canvas 2D');

            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);

            context.setTransform(1, 0, 0, 1, 0, 0);
            context.fillStyle = '#ffffff';
            context.fillRect(0, 0, canvas.width, canvas.height);

            const renderTask = page.render({canvasContext: context, viewport, canvas});
            renderTaskRef.current = renderTask;
            await renderTask.promise;
            if (cancelled) return;
            if (renderSeqRef.current !== seq) return;

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
                if (renderSeqRef.current === seq) {
                    renderTaskRef.current = null;
                }
            });

        return () => {
            cancelled = true;
            if (renderTaskRef.current) {
                try {
                    renderTaskRef.current.cancel?.();
                } catch {
                    // Ignore cancellation errors.
                }
            }
        };
    }, [doc, pageNum, pageCount, renderKey, viewportWidth]);

    useEffect(() => {
        return () => {
            if (doc) void doc.destroy();
        };
    }, [doc]);

    return (
        <Paper withBorder radius="md" p="sm" style={{height: '100%', minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column'}}>
            <Group justify="space-between" mb="sm">
                <Group gap="xs">
                    <ActionIcon variant="light" disabled={!canPrev} onClick={() => setPageNum(n => Math.max(1, n - 1))}>
                        <IconChevronLeft size={16}/>
                    </ActionIcon>
                    <ActionIcon
                        variant="light"
                        disabled={!canNext}
                        onClick={() => setPageNum(n => Math.min(pageCount, n + 1))}
                    >
                        <IconChevronRight size={16}/>
                    </ActionIcon>
                    <Text size="sm">
                        Pagina {pageNum} / {pageCount || '—'}
                    </Text>
                </Group>
                <Text size="xs" c="dimmed">
                    {viewportWidth ? `${viewportWidth}px` : ''}
                </Text>
            </Group>

            <div
                ref={setViewportEl}
                style={{
                    flex: 1,
                    minHeight: 0,
                    overflow: 'auto',
                    overscrollBehavior: 'contain',
                }}
            >
                {loading ? (
                    <Center style={{height: '100%'}}>
                        <Loader/>
                    </Center>
                ) : error ? (
                    <Center style={{height: '100%'}}>
                        <Text c="red" size="sm">
                            {error}
                        </Text>
                    </Center>
                ) : (
                    <Center p="xs" style={{minHeight: '100%'}}>
                        <canvas ref={canvasRef} style={{maxWidth: '100%', background: 'white', display: 'block'}}/>
                    </Center>
                )}
            </div>
        </Paper>
    );
}
