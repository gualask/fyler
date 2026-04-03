import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { type ReactNode, useCallback, useEffect, useRef } from 'react';
import type { QuarterTurn, SourceFile } from '@/shared/domain';
import { PdfCacheContext, type PdfRenderRequest } from '../pdf-cache.hook';
import { destroyAllPdfDocuments, destroyPdfDocument, getOrCreatePdfDocument } from './documents';
import { notify, subscribeRender } from './listeners';
import { getPageAspectRatio, getRender, requestRenders } from './renders';

function deleteEntriesByPrefix<V>(map: Map<string, V>, prefix: string) {
    for (const key of Array.from(map.keys())) {
        if (key.startsWith(prefix)) {
            map.delete(key);
        }
    }
}

function revokeObjectUrls(cache: Map<string, string> | undefined) {
    if (!cache) return;
    for (const url of cache.values()) {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
}

/**
 * In-memory cache for rendered PDF page images.
 *
 * The cache stores `blob:` object URLs and must explicitly revoke them to avoid
 * accumulating browser-managed memory. Call `releaseFile(fileId)` when a source
 * is removed from the session.
 */
export function PdfCacheProvider({ children }: { children: ReactNode }) {
    const cacheRef = useRef<Map<string, Map<string, string>>>(new Map());
    const aspectRatiosRef = useRef<Map<string, Map<string, number>>>(new Map());
    const pageTasksRef = useRef<Map<string, Promise<void>>>(new Map());
    const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());
    const docTasksRef = useRef<Map<string, PDFDocumentLoadingTask>>(new Map());
    const docPromisesRef = useRef<Map<string, Promise<PDFDocumentProxy>>>(new Map());

    const getPdfDocument = useCallback(
        (file: SourceFile) =>
            getOrCreatePdfDocument(file, {
                tasksByFileId: docTasksRef.current,
                promisesByFileId: docPromisesRef.current,
            }),
        [],
    );

    const subscribe = useCallback(
        (fileId: string, request: PdfRenderRequest, listener: () => void) =>
            subscribeRender(listenersRef.current, fileId, request, listener),
        [],
    );

    const notifyTask = useCallback((taskKey: string) => {
        notify(listenersRef.current, taskKey);
    }, []);

    const request = useCallback(
        (file: SourceFile, requests: PdfRenderRequest[]) => {
            requestRenders({
                file,
                requests,
                cacheByFileId: cacheRef.current,
                aspectRatiosByFileId: aspectRatiosRef.current,
                pageTasksByTaskKey: pageTasksRef.current,
                getPdfDocument,
                notifyTask,
            });
        },
        [getPdfDocument, notifyTask],
    );

    const get = useCallback(
        (fileId: string, request: PdfRenderRequest): string | undefined =>
            getRender(cacheRef.current, fileId, request),
        [],
    );

    const getAspectRatio = useCallback(
        (fileId: string, pageNum: number, quarterTurns: QuarterTurn): number | undefined =>
            getPageAspectRatio(aspectRatiosRef.current, fileId, pageNum, quarterTurns),
        [],
    );

    const releaseFile = useCallback((fileId: string) => {
        revokeObjectUrls(cacheRef.current.get(fileId));
        cacheRef.current.delete(fileId);
        aspectRatiosRef.current.delete(fileId);

        deleteEntriesByPrefix(listenersRef.current, `${fileId}:`);
        deleteEntriesByPrefix(pageTasksRef.current, `${fileId}:`);

        destroyPdfDocument(fileId, {
            tasksByFileId: docTasksRef.current,
            promisesByFileId: docPromisesRef.current,
        });
    }, []);

    useEffect(
        () => () => {
            for (const fileCache of cacheRef.current.values()) revokeObjectUrls(fileCache);
            destroyAllPdfDocuments({
                tasksByFileId: docTasksRef.current,
                promisesByFileId: docPromisesRef.current,
            });
            pageTasksRef.current.clear();
            listenersRef.current.clear();
        },
        [],
    );

    return (
        <PdfCacheContext.Provider
            value={{
                requestRenders: request,
                getRender: get,
                subscribeRender: subscribe,
                getPageAspectRatio: getAspectRatio,
                releaseFile,
            }}
        >
            {children}
        </PdfCacheContext.Provider>
    );
}
