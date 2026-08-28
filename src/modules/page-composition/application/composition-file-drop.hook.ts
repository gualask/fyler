import { type RefObject, useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

import type {
    DocumentSourcesPort,
    FileDragEvent,
    FileDragPosition,
} from '@/capabilities/document-sources/source.port';
import type { CompositionRegionKey } from '../model';

function regionAtPosition(
    position: FileDragPosition,
    regionRefs: Record<CompositionRegionKey, RefObject<HTMLElement | null>>,
): CompositionRegionKey | null {
    for (const region of ['top', 'bottom'] as const) {
        const rect = regionRefs[region].current?.getBoundingClientRect();
        if (
            rect &&
            position.x >= rect.left &&
            position.x <= rect.right &&
            position.y >= rect.top &&
            position.y <= rect.bottom
        ) {
            return region;
        }
    }
    return null;
}

export function useCompositionFileDrop({
    enabled,
    listen,
    regionRefs,
    onDrop,
}: {
    enabled: boolean;
    listen: DocumentSourcesPort['listenForFileDrag'];
    regionRefs: Record<CompositionRegionKey, RefObject<HTMLElement | null>>;
    onDrop: (region: CompositionRegionKey, paths: string[]) => void;
}) {
    const [dragRegion, setDragRegion] = useState<CompositionRegionKey | null>(null);
    const onDropRef = useRef(onDrop);
    const enabledRef = useRef(enabled);
    useLayoutEffect(() => {
        onDropRef.current = onDrop;
        enabledRef.current = enabled;
    });

    useEffect(() => {
        if (!enabled) setDragRegion(null);
    }, [enabled]);

    const handleFileDrag = useCallback(
        (event: FileDragEvent) => {
            if (event.type === 'leave' || !enabledRef.current) {
                setDragRegion(null);
                return;
            }
            const region = regionAtPosition(event.position, regionRefs);
            if (event.type !== 'drop') {
                setDragRegion(region);
                return;
            }
            setDragRegion(null);
            if (region && event.paths.length > 0) onDropRef.current(region, event.paths);
        },
        [regionRefs],
    );

    useEffect(() => listen(handleFileDrag), [handleFileDrag, listen]);
    return dragRegion;
}
