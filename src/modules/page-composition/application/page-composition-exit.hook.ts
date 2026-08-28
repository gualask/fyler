import { type RefObject, useState } from 'react';

import type { PageComposition } from '../model';
import { hasOwnedCompositionSources } from './page-composition-owned-state.hook';

export function useCompositionExit(
    compositionRef: RefObject<PageComposition>,
    discardComposition: () => void,
    onExit: () => void,
) {
    const [discardOpen, setDiscardOpen] = useState(false);
    const requestExit = () => {
        if (hasOwnedCompositionSources(compositionRef.current)) setDiscardOpen(true);
        else onExit();
    };
    const discardAndExit = () => {
        discardComposition();
        setDiscardOpen(false);
        onExit();
    };
    return { discardOpen, closeDiscard: () => setDiscardOpen(false), requestExit, discardAndExit };
}
