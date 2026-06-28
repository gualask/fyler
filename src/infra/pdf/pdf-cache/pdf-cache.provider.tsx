import { useQueryClient } from '@tanstack/react-query';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { type ReactNode, useCallback, useEffect, useMemo, useRef } from 'react';
import type { QuarterTurn, SourceFile } from '@/shared/domain';
import { PdfCacheContext, type PdfRenderRequest } from '../pdf-cache.hook';
import {
    destroyAllPdfDocuments,
    destroyPdfDocument,
    getOrCreatePdfDocument,
} from './pdf-cache.documents';
import { getPageAspectRatio, releasePdfRenderQueries, requestRenders } from './pdf-cache.renders';

function usePdfCacheRefs() {
    const docTasksRef = useRef<Map<string, PDFDocumentLoadingTask>>(new Map());
    const docPromisesRef = useRef<Map<string, Promise<PDFDocumentProxy>>>(new Map());
    const docPasswordsRef = useRef<Map<string, string>>(new Map());

    return useMemo(
        () => ({
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

function releasePdfDocument(fileId: string, refs: PdfCacheRefs) {
    destroyPdfDocument(fileId, pdfDocumentCaches(refs));
    refs.docPasswordsRef.current.delete(fileId);
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

function usePdfRenderAccess(getPdfDocument: (file: SourceFile) => Promise<PDFDocumentProxy>) {
    const queryClient = useQueryClient();

    const request = useCallback(
        (file: SourceFile, requests: PdfRenderRequest[]) => {
            requestRenders({
                file,
                requests,
                queryClient,
                getPdfDocument,
            });
        },
        [getPdfDocument, queryClient],
    );

    const getAspectRatio = useCallback(
        (fileId: string, pageNum: number, quarterTurns: QuarterTurn): number | undefined =>
            getPageAspectRatio(queryClient, fileId, pageNum, quarterTurns),
        [queryClient],
    );

    return { getAspectRatio, request };
}

function useReleasePdfCacheFile(refs: PdfCacheRefs) {
    const queryClient = useQueryClient();

    return useCallback(
        (fileId: string) => {
            releasePdfRenderQueries(queryClient, fileId);
            releasePdfDocument(fileId, refs);
        },
        [queryClient, refs],
    );
}

function usePdfCacheCleanup(refs: PdfCacheRefs) {
    const queryClient = useQueryClient();

    useEffect(
        () => () => {
            releasePdfRenderQueries(queryClient);
            disposePdfDocuments(refs);
        },
        [queryClient, refs],
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
    const { getAspectRatio, request } = usePdfRenderAccess(getPdfDocument);
    const releaseFile = useReleasePdfCacheFile(refs);

    usePdfCacheCleanup(refs);

    return (
        <PdfCacheContext.Provider
            value={{
                requestRenders: request,
                getPageAspectRatio: getAspectRatio,
                getPdfDocument,
                setPdfPassword,
                releaseFile,
            }}
        >
            {children}
        </PdfCacheContext.Provider>
    );
}
