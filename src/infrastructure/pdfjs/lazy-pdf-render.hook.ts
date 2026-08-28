import { useCallback, useEffect, useState } from 'react';

import type { SourceFile } from '@/capabilities/document-sources';
import { type PdfRenderRequest, usePdfCache } from './pdf-cache.hook';
import { usePdfRenderSrc } from './pdf-render-src.hook';

export function useLazyPdfRender(
    file: SourceFile | undefined,
    request: PdfRenderRequest | null,
    root: HTMLElement | null,
) {
    const { requestRenders } = usePdfCache();
    const [targetEl, setTargetEl] = useState<HTMLElement | null>(null);
    const [isNearViewport, setIsNearViewport] = useState(false);
    const dataUrl = usePdfRenderSrc(file, request);
    const attachTarget = useCallback((element: HTMLElement | null) => {
        setTargetEl(element);
    }, []);

    useEffect(() => {
        if (!targetEl) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsNearViewport(true);
                }
            },
            { root, rootMargin: '300px' },
        );
        observer.observe(targetEl);
        return () => observer.disconnect();
    }, [root, targetEl]);

    useEffect(() => {
        if (!file || !request || !isNearViewport || dataUrl) return;
        requestRenders(file, [request]);
    }, [dataUrl, file, isNearViewport, request, requestRenders]);

    return {
        dataUrl,
        isNearViewport,
        setTargetEl: attachTarget,
    };
}
