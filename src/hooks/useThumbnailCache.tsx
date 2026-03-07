import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const THUMB_WIDTH = 100;
const LARGE_WIDTH = 900;

type ThumbnailCacheContextType = {
    requestThumbnails: (url: string, pageCount: number) => void;
    getThumbnail: (url: string, pageNum: number) => string | undefined;
    renderPageLarge: (url: string, pageNum: number) => Promise<string | null>;
};

const ThumbnailCacheContext = createContext<ThumbnailCacheContextType | null>(null);

export function ThumbnailCacheProvider({ children }: { children: ReactNode }) {
    const cacheRef = useRef<Map<string, Map<number, string>>>(new Map());
    const largeCacheRef = useRef<Map<string, Map<number, string>>>(new Map());
    const requestedRef = useRef<Set<string>>(new Set());
    const [, setCacheVersion] = useState(0);

    const requestThumbnails = useCallback((url: string, pageCount: number) => {
        if (requestedRef.current.has(url)) return;
        requestedRef.current.add(url);

        void (async () => {
            const task = pdfjsLib.getDocument({ url });
            let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
            try {
                pdfDoc = await task.promise;
                const pageMap = new Map<number, string>();
                cacheRef.current.set(url, pageMap);

                for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
                    const page = await pdfDoc.getPage(pageNum);
                    const vp0 = page.getViewport({ scale: 1 });
                    const scale = THUMB_WIDTH / vp0.width;
                    const viewport = page.getViewport({ scale });

                    const canvas = document.createElement('canvas');
                    canvas.width = Math.floor(viewport.width);
                    canvas.height = Math.floor(viewport.height);
                    const ctx = canvas.getContext('2d')!;
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);

                    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

                    pageMap.set(pageNum, canvas.toDataURL('image/jpeg', 0.8));
                    setCacheVersion((v) => v + 1);
                }
            } catch {
                // Ignora errori di rendering
            } finally {
                await pdfDoc?.destroy();
            }
        })();
    }, []);

    const getThumbnail = useCallback(
        (url: string, pageNum: number): string | undefined =>
            cacheRef.current.get(url)?.get(pageNum),
        [],
    );

    const renderPageLarge = useCallback(
        async (url: string, pageNum: number): Promise<string | null> => {
            const cached = largeCacheRef.current.get(url)?.get(pageNum);
            if (cached) return cached;

            let pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;
            try {
                const task = pdfjsLib.getDocument({ url });
                pdfDoc = await task.promise;
                const page = await pdfDoc.getPage(pageNum);
                const vp0 = page.getViewport({ scale: 1 });
                const scale = LARGE_WIDTH / vp0.width;
                const viewport = page.getViewport({ scale });

                const canvas = document.createElement('canvas');
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                const ctx = canvas.getContext('2d')!;
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                await page.render({ canvasContext: ctx, viewport, canvas }).promise;

                const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
                if (!largeCacheRef.current.has(url)) largeCacheRef.current.set(url, new Map());
                largeCacheRef.current.get(url)!.set(pageNum, dataUrl);

                return dataUrl;
            } catch {
                return null;
            } finally {
                await pdfDoc?.destroy();
            }
        },
        [],
    );

    return (
        <ThumbnailCacheContext.Provider value={{ requestThumbnails, getThumbnail, renderPageLarge }}>
            {children}
        </ThumbnailCacheContext.Provider>
    );
}

export function useThumbnailCache(): ThumbnailCacheContextType {
    const ctx = useContext(ThumbnailCacheContext);
    if (!ctx) throw new Error('useThumbnailCache must be used within ThumbnailCacheProvider');
    return ctx;
}
