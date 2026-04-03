import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { QuarterTurn, SourceFile } from '@/shared/domain';
import { quarterTurnsToDegrees } from '@/shared/domain/file-edits';
import {
    getAspectRatioCacheKey,
    getPdfRenderCacheKey,
    type PdfRenderRequest,
} from '../pdf-cache.hook';
import { renderPdfPage } from '../render';
import { buildTaskKey } from './listeners';

function getOrCreateFileCache(cacheByFileId: Map<string, Map<string, string>>, fileId: string) {
    const existing = cacheByFileId.get(fileId);
    if (existing) return existing;
    const next = new Map<string, string>();
    cacheByFileId.set(fileId, next);
    return next;
}

function setAspectRatio(
    aspectRatiosByFileId: Map<string, Map<string, number>>,
    fileId: string,
    request: PdfRenderRequest,
    aspectRatio: number,
) {
    const arKey = getAspectRatioCacheKey(request.pageNum, request.quarterTurns);
    const existing = aspectRatiosByFileId.get(fileId);
    if (existing) {
        existing.set(arKey, aspectRatio);
        return;
    }
    const next = new Map<string, number>();
    next.set(arKey, aspectRatio);
    aspectRatiosByFileId.set(fileId, next);
}

export function requestRenders({
    file,
    requests,
    cacheByFileId,
    aspectRatiosByFileId,
    pageTasksByTaskKey,
    getPdfDocument,
    notifyTask,
}: {
    file: SourceFile;
    requests: PdfRenderRequest[];
    cacheByFileId: Map<string, Map<string, string>>;
    aspectRatiosByFileId: Map<string, Map<string, number>>;
    pageTasksByTaskKey: Map<string, Promise<void>>;
    getPdfDocument: (file: SourceFile) => Promise<PDFDocumentProxy>;
    notifyTask: (taskKey: string) => void;
}) {
    if (file.kind !== 'pdf') return;

    const fileCache = getOrCreateFileCache(cacheByFileId, file.id);

    for (const request of requests) {
        const cacheKey = getPdfRenderCacheKey(request);
        if (fileCache.has(cacheKey)) continue;

        const taskKey = buildTaskKey(file.id, cacheKey);
        if (pageTasksByTaskKey.has(taskKey)) continue;

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
                const currentCache = cacheByFileId.get(file.id);
                if (!currentCache) return;
                const objectUrl = URL.createObjectURL(blob);
                currentCache.set(cacheKey, objectUrl);
                setAspectRatio(aspectRatiosByFileId, file.id, request, aspectRatio);
                notifyTask(taskKey);
            } catch {
                // Keep previous renders if a refresh for a new variant fails.
            } finally {
                pageTasksByTaskKey.delete(taskKey);
            }
        })();

        pageTasksByTaskKey.set(taskKey, task);
    }
}

export function getRender(
    cacheByFileId: Map<string, Map<string, string>>,
    fileId: string,
    request: PdfRenderRequest,
) {
    return cacheByFileId.get(fileId)?.get(getPdfRenderCacheKey(request));
}

export function getPageAspectRatio(
    aspectRatiosByFileId: Map<string, Map<string, number>>,
    fileId: string,
    pageNum: number,
    quarterTurns: QuarterTurn,
) {
    return aspectRatiosByFileId.get(fileId)?.get(getAspectRatioCacheKey(pageNum, quarterTurns));
}
