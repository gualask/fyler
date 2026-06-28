import {
    type QueryCache,
    type QueryCacheNotifyEvent,
    type QueryKey,
    queryOptions,
} from '@tanstack/react-query';
import { getImagePreview } from '@/infra/platform';
import type { ImagePreviewBytes } from '@/infra/platform/platform-adapter';

export type ImagePreviewStatus = 'idle' | 'pending' | 'ready' | 'fallback' | 'failed';

export type ImagePreviewSnapshot = {
    src: string | null;
    status: ImagePreviewStatus;
};

export type ImagePreviewQueryInput = {
    fileId: string;
    originalPath: string;
};

export type ImagePreviewQueryData = {
    objectUrl: string | null;
    status: Extract<ImagePreviewStatus, 'ready' | 'fallback'>;
};

export type ImagePreviewQueryKey = readonly ['image-preview', string, string];

export const IMAGE_PREVIEW_GC_TIME_MS = 100;
const IMAGE_PREVIEW_QUERY_ROOT = 'image-preview';

const IMAGE_PREVIEW_QUERY_DEFAULTS = {
    gcTime: IMAGE_PREVIEW_GC_TIME_MS,
    refetchOnMount: false,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
    staleTime: Infinity,
    structuralSharing: false,
} as const;

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

function getImagePreviewObjectUrl(data: unknown): string | null {
    if (!data || typeof data !== 'object' || !('objectUrl' in data)) return null;
    const objectUrl = data.objectUrl;
    return typeof objectUrl === 'string' ? objectUrl : null;
}

export function imagePreviewQueryKey(input: ImagePreviewQueryInput): ImagePreviewQueryKey {
    return [IMAGE_PREVIEW_QUERY_ROOT, input.fileId, input.originalPath];
}

function isImagePreviewQueryKey(queryKey: QueryKey): queryKey is ImagePreviewQueryKey {
    return (
        queryKey.length === 3 &&
        queryKey[0] === IMAGE_PREVIEW_QUERY_ROOT &&
        typeof queryKey[1] === 'string' &&
        typeof queryKey[2] === 'string'
    );
}

export async function loadImagePreviewData(fileId: string): Promise<ImagePreviewQueryData> {
    const preview = await getImagePreview(fileId);
    const objectUrl = preview ? objectUrlFromBytes(preview) : null;
    return objectUrl ? { objectUrl, status: 'ready' } : { objectUrl: null, status: 'fallback' };
}

export function imagePreviewQueryOptions(input: ImagePreviewQueryInput) {
    return queryOptions({
        ...IMAGE_PREVIEW_QUERY_DEFAULTS,
        queryKey: imagePreviewQueryKey(input),
        queryFn: () => loadImagePreviewData(input.fileId),
    });
}

function updateTrackedUrl(trackedUrls: Map<string, string>, event: QueryCacheNotifyEvent) {
    if (!isImagePreviewQueryKey(event.query.queryKey)) return;

    const queryHash = event.query.queryHash;
    const currentUrl = getImagePreviewObjectUrl(event.query.state.data);
    const trackedUrl = trackedUrls.get(queryHash);

    if (event.type === 'removed') {
        maybeRevokeObjectUrl(trackedUrl ?? currentUrl);
        trackedUrls.delete(queryHash);
        return;
    }

    if (trackedUrl && trackedUrl !== currentUrl) {
        maybeRevokeObjectUrl(trackedUrl);
    }

    if (currentUrl) {
        trackedUrls.set(queryHash, currentUrl);
    } else {
        trackedUrls.delete(queryHash);
    }
}

export function registerImagePreviewQueryCacheCleanup(queryCache: QueryCache): () => void {
    const trackedUrls = new Map<string, string>();
    return queryCache.subscribe((event) => updateTrackedUrl(trackedUrls, event));
}
