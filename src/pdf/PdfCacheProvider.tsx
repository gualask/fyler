import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';

import { quarterTurnsToDegrees } from '@/domain/fileEdits';
import { getPreviewUrl } from '@/platform';
import { pdfjsLib, renderPdfPage } from './render';
import { PdfCacheContext, getPdfRenderCacheKey, type PdfRenderRequest } from './usePdfCache';
import type { SourceFile } from '@/domain';

export function PdfCacheProvider({ children }: { children: ReactNode }) {
    const cacheRef = useRef<Map<string, Map<string, string>>>(new Map());
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

    const requestRenders = useCallback((file: SourceFile, requests: PdfRenderRequest[]) => {
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
                    const dataUrl = await renderPdfPage(
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
                    setCacheVersion((value) => value + 1);
                } catch {
                    // Keep previous renders if a refresh for a new variant fails.
                } finally {
                    pageTasksRef.current.delete(taskKey);
                }
            })();

            pageTasksRef.current.set(taskKey, task);
        }
    }, [getPdfDocument]);

    const getRender = useCallback((fileId: string, request: PdfRenderRequest): string | undefined => (
        cacheRef.current.get(fileId)?.get(getPdfRenderCacheKey(request))
    ), []);

    const releaseFile = useCallback((fileId: string) => {
        cacheRef.current.delete(fileId);
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

    useEffect(() => () => {
        for (const task of docTasksRef.current.values()) {
            void task.destroy();
        }
        docTasksRef.current.clear();
        docPromisesRef.current.clear();
        pageTasksRef.current.clear();
    }, []);

    return (
        <PdfCacheContext.Provider value={{ requestRenders, getRender, releaseFile }}>
            {children}
        </PdfCacheContext.Provider>
    );
}
