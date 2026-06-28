import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import type { QuarterTurn, SourceFile } from '@/shared/domain';
import { PdfCacheContext, type PdfRenderRequest } from '../pdf-cache.hook';
import {
    destroyAllPdfDocuments,
    destroyPdfDocument,
    getOrCreatePdfDocument,
} from './pdf-cache.documents';
import { notify, subscribeRender } from './pdf-cache.listeners';
import { getPageAspectRatio, getRender, requestRenders } from './pdf-cache.renders';

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

function usePdfCacheRefs() {
    const cacheRef = useRef<Map<string, Map<string, string>>>(new Map());
    const aspectRatiosRef = useRef<Map<string, Map<string, number>>>(new Map());
    const pageTasksRef = useRef<Map<string, Promise<void>>>(new Map());
    const listenersRef = useRef<Map<string, Set<() => void>>>(new Map());
    const docTasksRef = useRef<Map<string, PDFDocumentLoadingTask>>(new Map());
    const docPromisesRef = useRef<Map<string, Promise<PDFDocumentProxy>>>(new Map());
    const docPasswordsRef = useRef<Map<string, string>>(new Map());

    return useMemo(
        () => ({
            cacheRef,
            aspectRatiosRef,
            pageTasksRef,
            listenersRef,
            docTasksRef,
            docPromisesRef,
            docPasswordsRef,
        }),
        [],
    );
}

type PdfCacheRefs = ReturnType<typeof usePdfCacheRefs>;

function pdfDocumentCaches(refs: PdfCacheRefs) {
    return {
        tasksByFileId: refs.docTasksRef.current,
        promisesByFileId: refs.docPromisesRef.current,
        passwordsByFileId: refs.docPasswordsRef.current,
    };
}

function releaseRenderCache(fileId: string, refs: PdfCacheRefs) {
    revokeObjectUrls(refs.cacheRef.current.get(fileId));
    refs.cacheRef.current.delete(fileId);
    refs.aspectRatiosRef.current.delete(fileId);

    deleteEntriesByPrefix(refs.listenersRef.current, `${fileId}:`);
    deleteEntriesByPrefix(refs.pageTasksRef.current, `${fileId}:`);
}

function releasePdfDocument(fileId: string, refs: PdfCacheRefs) {
    destroyPdfDocument(fileId, pdfDocumentCaches(refs));
    refs.docPasswordsRef.current.delete(fileId);
}

function disposeRenderCaches(refs: PdfCacheRefs) {
    for (const fileCache of refs.cacheRef.current.values()) {
        revokeObjectUrls(fileCache);
    }
    refs.pageTasksRef.current.clear();
    refs.listenersRef.current.clear();
}

function disposePdfDocuments(refs: PdfCacheRefs) {
    destroyAllPdfDocuments(pdfDocumentCaches(refs));
    refs.docPasswordsRef.current.clear();
}

function usePdfDocumentAccess(refs: PdfCacheRefs) {
    const getPdfDocument = useCallback(
        (file: SourceFile) => getOrCreatePdfDocument(file, pdfDocumentCaches(refs)),
        [refs],
    );

    const setPdfPassword = useCallback(
        (fileId: string, password: string) => {
            refs.docPasswordsRef.current.set(fileId, password);
        },
        [refs],
    );

    return { getPdfDocument, setPdfPassword };
}

function usePdfRenderAccess(
    refs: PdfCacheRefs,
    getPdfDocument: (file: SourceFile) => Promise<PDFDocumentProxy>,
) {
    const subscribe = useCallback(
        (fileId: string, request: PdfRenderRequest, listener: () => void) =>
            subscribeRender(refs.listenersRef.current, fileId, request, listener),
        [refs],
    );

    const notifyTask = useCallback(
        (taskKey: string) => {
            notify(refs.listenersRef.current, taskKey);
        },
        [refs],
    );

    const request = useCallback(
        (file: SourceFile, requests: PdfRenderRequest[]) => {
            requestRenders({
                file,
                requests,
                cacheByFileId: refs.cacheRef.current,
                aspectRatiosByFileId: refs.aspectRatiosRef.current,
                pageTasksByTaskKey: refs.pageTasksRef.current,
                getPdfDocument,
                notifyTask,
            });
        },
        [getPdfDocument, notifyTask, refs],
    );

    const get = useCallback(
        (fileId: string, request: PdfRenderRequest): string | undefined =>
            getRender(refs.cacheRef.current, fileId, request),
        [refs],
    );

    const getAspectRatio = useCallback(
        (fileId: string, pageNum: number, quarterTurns: QuarterTurn): number | undefined =>
            getPageAspectRatio(refs.aspectRatiosRef.current, fileId, pageNum, quarterTurns),
        [refs],
    );

    return { get, getAspectRatio, request, subscribe };
}

function useReleasePdfCacheFile(refs: PdfCacheRefs) {
    return useCallback(
        (fileId: string) => {
            releaseRenderCache(fileId, refs);
            releasePdfDocument(fileId, refs);
        },
        [refs],
    );
}

function usePdfCacheCleanup(refs: PdfCacheRefs) {
    useEffect(
        () => () => {
            disposeRenderCaches(refs);
            disposePdfDocuments(refs);
        },
        [refs],
    );
}

/**
 * In-memory cache for rendered PDF page images.
 *
 * The cache stores `blob:` object URLs and must explicitly revoke them to avoid
 * accumulating browser-managed memory. Call `releaseFile(fileId)` when a source
 * is removed from the session.
 */
export function PdfCacheProvider({ children }: { children: ReactNode }) {
    const refs = usePdfCacheRefs();
    const { getPdfDocument, setPdfPassword } = usePdfDocumentAccess(refs);
    const { get, getAspectRatio, request, subscribe } = usePdfRenderAccess(refs, getPdfDocument);
    const releaseFile = useReleasePdfCacheFile(refs);

    usePdfCacheCleanup(refs);

    return (
        <PdfCacheContext.Provider
            value={{
                requestRenders: request,
                getRender: get,
                subscribeRender: subscribe,
                getPageAspectRatio: getAspectRatio,
                setPdfPassword,
                releaseFile,
            }}
        >
            {children}
        </PdfCacheContext.Provider>
    );
}
