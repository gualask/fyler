import { QueryCache, QueryClient } from '@tanstack/react-query';

import { registerImagePreviewQueryCacheCleanup } from '@/infra/image-preview/image-preview.cache';
import { registerPdfRenderQueryCacheCleanup } from '@/infra/pdf/pdf-cache/pdf-cache.renders';

export function createAppQueryClient() {
    const queryCache = new QueryCache();
    registerImagePreviewQueryCacheCleanup(queryCache);
    registerPdfRenderQueryCacheCleanup(queryCache);

    return new QueryClient({
        queryCache,
        defaultOptions: {
            queries: {
                retry: false,
                refetchOnReconnect: false,
                refetchOnWindowFocus: false,
            },
        },
    });
}
