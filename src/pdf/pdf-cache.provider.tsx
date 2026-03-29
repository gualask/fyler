import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import type { QuarterTurn, SourceFile } from '@/domain';
import { quarterTurnsToDegrees } from '@/domain/file-edits';
import { getPreviewUrl } from '@/platform';
import {
    getAspectRatioCacheKey,
    getPdfRenderCacheKey,
    PdfCacheContext,
    type PdfRenderRequest,
} from './pdf-cache.hook';
import { pdfjsLib, renderPdfPage } from './render';

function revokeObjectUrls(cache: Map<string, string> | undefined) {
    if (!cache) return;
    for (const url of cache.values()) {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
}

export function PdfCacheProvider({ children }: { children: ReactNode }) {
    const cacheRef = useRef<Map<string, Map<string, string>>>(new Map());
    const aspectRatiosRef = useRef<Map<string, Map<string, number>>>(new Map());
    const pageTasksRef = useRef<Map<string, Promise<void>>>(new Map());
    const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());
    const docTasksRef = useRef<Map<string, PDFDocumentLoadingTask>>(new Map());
    const docPromisesRef = useRef<Map<string, Promise<PDFDocumentProxy>>>(new Map());

    const getPdfDocument = useCallback((file: SourceFile): Promise<PDFDocumentProxy> => {
        const existing = docPromisesRef.current.get(file.id);
        if (existing) return existing;

        const loadingTask = pdfjsLib.getDocument({ url: getPreviewUrl(file.originalPath) });
        docTasksRef.current.set(file.id, loadingTask);
        const promise = loadingTask.promise.catch((error) => {
            docPromisesRef.current.delete(file.id);
            docTasksRef.current.delete(file.id);
            void loadingTask.destroy();
            throw error;
        });
        docPromisesRef.current.set(file.id, promise);
        return promise;
    }, []);

    const subscribeRender = useCallback(
        (fileId: string, request: PdfRenderRequest, listener: () => void) => {
            const cacheKey = getPdfRenderCacheKey(request);
            const taskKey = `${fileId}:${cacheKey}`;
            const set = listenersRef.current.get(taskKey) ?? new Set<() => void>();
            set.add(listener);
            listenersRef.current.set(taskKey, set);
            return () => {
                const current = listenersRef.current.get(taskKey);
                if (!current) return;
                current.delete(listener);
                if (!current.size) {
                    listenersRef.current.delete(taskKey);
                }
            };
        },
        [],
    );

    const notify = useCallback((taskKey: string) => {
        const listeners = listenersRef.current.get(taskKey);
        if (!listeners?.size) return;
        for (const listener of listeners) {
            listener();
        }
    }, []);

    const requestRenders = useCallback(
        (file: SourceFile, requests: PdfRenderRequest[]) => {
            if (file.kind !== 'pdf') return;

            const fileCache = cacheRef.current.get(file.id) ?? new Map<string, string>();
            cacheRef.current.set(file.id, fileCache);

            for (const request of requests) {
                const cacheKey = getPdfRenderCacheKey(request);
                if (fileCache.has(cacheKey)) continue;

                const taskKey = `${file.id}:${cacheKey}`;
                if (pageTasksRef.current.has(taskKey)) continue;

                const task = (async () => {
                    try {
                        const pdfDoc = await getPdfDocument(file);
                        const { blob, aspectRatio } = await renderPdfPage(
                            pdfDoc,
                            request.pageNum,
                            request.width,
                            request.quality,
                            quarterTurnsToDegrees(request.quarterTurns),
                            request.density ?? 1,
                        );
                        const currentCache = cacheRef.current.get(file.id);
                        if (!currentCache) return;
                        const objectUrl = URL.createObjectURL(blob);
                        currentCache.set(cacheKey, objectUrl);
                        const arKey = getAspectRatioCacheKey(request.pageNum, request.quarterTurns);
                        const fileAR =
                            aspectRatiosRef.current.get(file.id) ?? new Map<string, number>();
                        fileAR.set(arKey, aspectRatio);
                        aspectRatiosRef.current.set(file.id, fileAR);
                        notify(taskKey);
                    } catch {
                        // Keep previous renders if a refresh for a new variant fails.
                    } finally {
                        pageTasksRef.current.delete(taskKey);
                    }
                })();

                pageTasksRef.current.set(taskKey, task);
            }
        },
        [getPdfDocument, notify],
    );

    const getRender = useCallback(
        (fileId: string, request: PdfRenderRequest): string | undefined =>
            cacheRef.current.get(fileId)?.get(getPdfRenderCacheKey(request)),
        [],
    );

    const getPageAspectRatio = useCallback(
        (fileId: string, pageNum: number, quarterTurns: QuarterTurn): number | undefined =>
            aspectRatiosRef.current.get(fileId)?.get(getAspectRatioCacheKey(pageNum, quarterTurns)),
        [],
    );

    const releaseFile = useCallback((fileId: string) => {
        revokeObjectUrls(cacheRef.current.get(fileId));
        cacheRef.current.delete(fileId);
        aspectRatiosRef.current.delete(fileId);
        docPromisesRef.current.delete(fileId);

        for (const taskKey of Array.from(listenersRef.current.keys())) {
            if (taskKey.startsWith(`${fileId}:`)) {
                listenersRef.current.delete(taskKey);
            }
        }

        for (const taskKey of Array.from(pageTasksRef.current.keys())) {
            if (taskKey.startsWith(`${fileId}:`)) {
                pageTasksRef.current.delete(taskKey);
            }
        }

        const docTask = docTasksRef.current.get(fileId);
        docTasksRef.current.delete(fileId);
        void docTask?.destroy();
    }, []);

    useEffect(
        () => () => {
            for (const fileCache of cacheRef.current.values()) revokeObjectUrls(fileCache);
            for (const task of docTasksRef.current.values()) {
                void task.destroy();
            }
            docTasksRef.current.clear();
            docPromisesRef.current.clear();
            pageTasksRef.current.clear();
            listenersRef.current.clear();
        },
        [],
    );

    return (
        <PdfCacheContext.Provider
            value={{ requestRenders, getRender, subscribeRender, getPageAspectRatio, releaseFile }}
        >
            {children}
        </PdfCacheContext.Provider>
    );
}
