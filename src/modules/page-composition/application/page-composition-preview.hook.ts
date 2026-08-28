import { useEffect, useState } from 'react';
import {
    type CompositionPreviewLayout,
    type PageComposition,
    toPreviewLayoutRequest,
} from '../model';
import type { PageCompositionPort } from './page-composition.port';

export function useCompositionPreview(
    composition: PageComposition,
    compositionPort: PageCompositionPort,
    showError: (error: unknown) => void,
    messages: { updating: string; ready: string; error: string },
) {
    const [layout, setLayout] = useState<CompositionPreviewLayout | null>(null);
    const [status, setStatus] = useState('');
    useEffect(() => {
        let active = true;
        setStatus(messages.updating);
        void compositionPort
            .getPreviewLayout(toPreviewLayoutRequest(composition))
            .then((nextLayout) => {
                if (!active) return;
                setLayout(nextLayout);
                setStatus(messages.ready);
            })
            .catch((error) => {
                if (!active) return;
                showError(error);
                setStatus(messages.error);
            });
        return () => {
            active = false;
        };
    }, [
        composition,
        compositionPort,
        messages.error,
        messages.ready,
        messages.updating,
        showError,
    ]);
    return { layout, status, setStatus };
}
