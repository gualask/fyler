import { getPdfRenderCacheKey, type PdfRenderRequest } from '../pdf-cache.hook';

/** Stable task identifier for a `(fileId, render-cache-key)` pair. */
export function buildTaskKey(fileId: string, cacheKey: string) {
    return `${fileId}:${cacheKey}`;
}

function getOrCreateListenerSet(listenersByTaskKey: Map<string, Set<() => void>>, taskKey: string) {
    const existing = listenersByTaskKey.get(taskKey);
    if (existing) return existing;
    const next = new Set<() => void>();
    listenersByTaskKey.set(taskKey, next);
    return next;
}

export function subscribeRender(
    listenersByTaskKey: Map<string, Set<() => void>>,
    fileId: string,
    request: PdfRenderRequest,
    listener: () => void,
) {
    const cacheKey = getPdfRenderCacheKey(request);
    const taskKey = buildTaskKey(fileId, cacheKey);
    const set = getOrCreateListenerSet(listenersByTaskKey, taskKey);
    set.add(listener);
    return () => {
        const current = listenersByTaskKey.get(taskKey);
        if (!current) return;
        current.delete(listener);
        if (!current.size) {
            listenersByTaskKey.delete(taskKey);
        }
    };
}

/** Notifies all listeners subscribed to `taskKey` (if any). */
export function notify(listenersByTaskKey: Map<string, Set<() => void>>, taskKey: string) {
    const listeners = listenersByTaskKey.get(taskKey);
    if (!listeners?.size) return;
    for (const listener of listeners) {
        listener();
    }
}
