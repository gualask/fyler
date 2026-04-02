import { getAspectRatioCacheKey, type PdfRenderRequest } from './pdf-cache.hook';

export function buildTaskKey(fileId: string, cacheKey: string) {
    return `${fileId}:${cacheKey}`;
}
export function getOrCreateFileCache(
    cacheByFileId: Map<string, Map<string, string>>,
    fileId: string,
) {
    const existing = cacheByFileId.get(fileId);
    if (existing) return existing;
    const next = new Map<string, string>();
    cacheByFileId.set(fileId, next);
    return next;
}

export function setAspectRatio(
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

export function getOrCreateListenerSet(
    listenersByTaskKey: Map<string, Set<() => void>>,
    taskKey: string,
) {
    const existing = listenersByTaskKey.get(taskKey);
    if (existing) return existing;
    const next = new Set<() => void>();
    listenersByTaskKey.set(taskKey, next);
    return next;
}

export function deleteEntriesByPrefix<V>(map: Map<string, V>, prefix: string) {
    for (const key of Array.from(map.keys())) {
        if (key.startsWith(prefix)) {
            map.delete(key);
        }
    }
}

export function revokeObjectUrls(cache: Map<string, string> | undefined) {
    if (!cache) return;
    for (const url of cache.values()) {
        if (url.startsWith('blob:')) {
            URL.revokeObjectURL(url);
        }
    }
}
