import { useSyncExternalStore } from 'react';

import type { SourceFile } from '@/domain';
import type { PdfRenderRequest } from './pdf-cache.hook';
import { usePdfCache } from './pdf-cache.hook';

export function usePdfRenderSrc(
    file: SourceFile | undefined,
    request: PdfRenderRequest | null,
): string | undefined {
    const { getRender, subscribeRender } = usePdfCache();

    return useSyncExternalStore(
        (listener) => {
            if (!file || !request) return () => {};
            return subscribeRender(file.id, request, listener);
        },
        () => {
            if (!file || !request) return undefined;
            return getRender(file.id, request);
        },
        () => undefined,
    );
}
