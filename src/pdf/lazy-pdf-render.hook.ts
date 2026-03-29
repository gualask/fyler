import { useCallback, useEffect, useState } from 'react';

import type { SourceFile } from '@/domain';
import { type PdfRenderRequest, usePdfCache } from './pdf-cache.hook';
import { usePdfRenderSrc } from './pdf-render-src.hook';

export function useLazyPdfRender(
    file: SourceFile | undefined,
    request: PdfRenderRequest | null,
    root: HTMLElement | null,
) {
    const { requestRenders } = usePdfCache();
    const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
    const [shouldRequest, setShouldRequest] = useState(false);
    const dataUrl = usePdfRenderSrc(file, request);
    const attachTarget = useCallback((element: HTMLElement | null) => {
        setTargetEl(element);
    }, []);

    useEffect(() => {
        if (!targetEl || !file || !request) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setShouldRequest(true);
                }
            },
            { root, rootMargin: '300px' },
        );
        observer.observe(targetEl);
        return () => observer.disconnect();
    }, [file, request, root, targetEl]);

    useEffect(() => {
        if (!file || !request || !shouldRequest || dataUrl) return;
        requestRenders(file, [request]);
    }, [dataUrl, file, request, requestRenders, shouldRequest]);

    return {
        dataUrl,
        setTargetEl: attachTarget,
    };
}
