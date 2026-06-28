import { getImagePreview } from '@/infra/platform';
import type { ImagePreviewBytes } from '@/infra/platform/platform-adapter';

export type ImagePreviewStatus = 'idle' | 'pending' | 'ready' | 'fallback' | 'failed';

export type ImagePreviewSnapshot = {
    src: string | null;
    status: ImagePreviewStatus;
};

export type ImagePreviewKey = {
    key: string;
    fileId: string;
    sourceUrl: string;
};

export type ImagePreviewCacheStats = {
    retains: number;
    loads: number;
    hits: number;
    entries: number;
    refs: number;
};

type CacheEntry = ImagePreviewKey & {
    status: ImagePreviewStatus;
    url: string | null;
    refs: number;
    listeners: Set<() => void>;
    promise: Promise<void> | null;
    releaseTimer: ReturnType<typeof setTimeout> | null;
};

const RELEASE_DELAY_MS = 100;
const cache = new Map<string, CacheEntry>();
const statsListeners = new Set<() => void>();
let retainCount = 0;
let loadCount = 0;
let hitCount = 0;

function emitStats() {
    for (const listener of statsListeners) {
        listener();
    }
}

export function getImagePreviewCacheStats(): ImagePreviewCacheStats {
    return {
        retains: retainCount,
        loads: loadCount,
        hits: hitCount,
        entries: cache.size,
        refs: Array.from(cache.values()).reduce((total, entry) => total + entry.refs, 0),
    };
}

export function subscribeImagePreviewCacheStats(listener: () => void): () => void {
    statsListeners.add(listener);
    return () => statsListeners.delete(listener);
}

function maybeRevokeObjectUrl(url: string | null | undefined) {
    if (url?.startsWith('blob:')) {
        URL.revokeObjectURL(url);
    }
}

function bytesToArrayBuffer(bytes: ImagePreviewBytes): ArrayBuffer {
    if (bytes instanceof ArrayBuffer) return bytes;

    const data = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const buffer = new ArrayBuffer(data.byteLength);
    new Uint8Array(buffer).set(data);
    return buffer;
}

function objectUrlFromBytes(bytes: ImagePreviewBytes): string | null {
    const data = bytesToArrayBuffer(bytes);
    if (data.byteLength === 0) return null;
    return URL.createObjectURL(new Blob([data], { type: 'image/jpeg' }));
}

function snapshot(entry: CacheEntry): ImagePreviewSnapshot {
    if (entry.url) {
        return { src: entry.url, status: entry.status };
    }

    if (entry.status === 'fallback' || entry.status === 'failed') {
        return { src: entry.sourceUrl, status: entry.status };
    }

    return { src: null, status: entry.status };
}

function notify(entry: CacheEntry) {
    for (const listener of entry.listeners) {
        listener();
    }
}

function isCurrentEntry(entry: CacheEntry): boolean {
    return cache.get(entry.key) === entry;
}

function applyPreviewResult(entry: CacheEntry, preview: ImagePreviewBytes | null) {
    const url = preview ? objectUrlFromBytes(preview) : null;
    if (url) {
        entry.url = url;
        entry.status = 'ready';
    } else {
        entry.url = null;
        entry.status = 'fallback';
    }
    entry.promise = null;
    notify(entry);
}

function applyPreviewFailure(entry: CacheEntry) {
    entry.url = null;
    entry.status = 'failed';
    entry.promise = null;
    notify(entry);
}

function startLoad(entry: CacheEntry) {
    if (entry.promise || entry.status === 'ready') return;

    loadCount += 1;
    emitStats();
    entry.status = 'pending';
    entry.promise = getImagePreview(entry.fileId)
        .then((preview) => {
            if (isCurrentEntry(entry)) applyPreviewResult(entry, preview);
        })
        .catch(() => {
            if (isCurrentEntry(entry)) applyPreviewFailure(entry);
        });
}

function getOrCreateEntry(input: ImagePreviewKey): CacheEntry {
    const existing = cache.get(input.key);
    if (existing) {
        hitCount += 1;
        existing.sourceUrl = input.sourceUrl;
        if (existing.releaseTimer) {
            clearTimeout(existing.releaseTimer);
            existing.releaseTimer = null;
        }
        emitStats();
        return existing;
    }

    const entry: CacheEntry = {
        ...input,
        status: 'pending',
        url: null,
        refs: 0,
        listeners: new Set(),
        promise: null,
        releaseTimer: null,
    };
    cache.set(input.key, entry);
    startLoad(entry);
    emitStats();
    return entry;
}

function releaseEntry(entry: CacheEntry) {
    entry.refs = Math.max(0, entry.refs - 1);
    if (entry.refs > 0 || entry.releaseTimer) return;

    entry.releaseTimer = setTimeout(() => {
        entry.releaseTimer = null;
        if (entry.refs > 0) return;

        maybeRevokeObjectUrl(entry.url);
        cache.delete(entry.key);
        emitStats();
    }, RELEASE_DELAY_MS);
}

export function retainImagePreview(input: ImagePreviewKey, onChange: () => void) {
    const entry = getOrCreateEntry(input);
    retainCount += 1;
    entry.refs += 1;
    entry.listeners.add(onChange);
    emitStats();

    return {
        getSnapshot: () => snapshot(entry),
        release: () => {
            entry.listeners.delete(onChange);
            releaseEntry(entry);
            emitStats();
        },
    };
}

export function resetImagePreviewCacheForTest() {
    for (const entry of cache.values()) {
        if (entry.releaseTimer) {
            clearTimeout(entry.releaseTimer);
        }
        maybeRevokeObjectUrl(entry.url);
    }
    cache.clear();
    retainCount = 0;
    loadCount = 0;
    hitCount = 0;
    emitStats();
}
