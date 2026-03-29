import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
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

export function PdfCacheProvider({ children }: { children: ReactNode }) {
    const cacheRef = useRef<Map<string, Map<string, string>>>(new Map());
    const aspectRatiosRef = useRef<Map<string, Map<string, number>>>(new Map());
    const pageTasksRef = useRef<Map<string, Promise<void>>>(new Map());
    const docTasksRef = useRef<Map<string, PDFDocumentLoadingTask>>(new Map());
    const docPromisesRef = useRef<Map<string, Promise<PDFDocumentProxy>>>(new Map());
    const [, setCacheVersion] = useState(0);

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
                        const { dataUrl, aspectRatio } = await renderPdfPage(
                            pdfDoc,
                            request.pageNum,
                            request.width,
                            request.quality,
                            quarterTurnsToDegrees(request.quarterTurns),
                            request.density ?? 1,
                        );
                        const currentCache = cacheRef.current.get(file.id);
                        if (!currentCache) return;
                        currentCache.set(cacheKey, dataUrl);
                        const arKey = getAspectRatioCacheKey(request.pageNum, request.quarterTurns);
                        const fileAR =
                            aspectRatiosRef.current.get(file.id) ?? new Map<string, number>();
                        fileAR.set(arKey, aspectRatio);
                        aspectRatiosRef.current.set(file.id, fileAR);
                        setCacheVersion((value) => value + 1);
                    } catch {
                        // Keep previous renders if a refresh for a new variant fails.
                    } finally {
                        pageTasksRef.current.delete(taskKey);
                    }
                })();

                pageTasksRef.current.set(taskKey, task);
            }
        },
        [getPdfDocument],
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
        cacheRef.current.delete(fileId);
        aspectRatiosRef.current.delete(fileId);
        docPromisesRef.current.delete(fileId);

        for (const taskKey of Array.from(pageTasksRef.current.keys())) {
            if (taskKey.startsWith(`${fileId}:`)) {
                pageTasksRef.current.delete(taskKey);
            }
        }

        const docTask = docTasksRef.current.get(fileId);
        docTasksRef.current.delete(fileId);
        void docTask?.destroy();
        setCacheVersion((value) => value + 1);
    }, []);

    useEffect(
        () => () => {
            for (const task of docTasksRef.current.values()) {
                void task.destroy();
            }
            docTasksRef.current.clear();
            docPromisesRef.current.clear();
            pageTasksRef.current.clear();
        },
        [],
    );

    return (
        <PdfCacheContext.Provider
            value={{ requestRenders, getRender, getPageAspectRatio, releaseFile }}
        >
            {children}
        </PdfCacheContext.Provider>
    );
}
