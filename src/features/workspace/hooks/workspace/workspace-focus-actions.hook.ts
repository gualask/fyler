import { useCallback } from 'react';
import type { SourceTarget } from '@/shared/domain';
import type { FocusFlashTarget } from '../../state/workspace.store';

function useFocusSource(
    focusSource: (fileId: string, target: SourceTarget, flashTarget: FocusFlashTarget) => void,
) {
    return useCallback(
        (fileId: string, target: SourceTarget, flashTarget: FocusFlashTarget) => {
            focusSource(fileId, target, flashTarget);
        },
        [focusSource],
    );
}

export function useWorkspaceFocusActions(
    focusSourceAction: (
        fileId: string,
        target: SourceTarget,
        flashTarget: FocusFlashTarget,
    ) => void,
) {
    const focusSource = useFocusSource(focusSourceAction);

    const focusFinalPageSource = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSource(fileId, target, 'picker');
        },
        [focusSource],
    );

    const focusFinalPageInDocument = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSource(fileId, target, 'final');
        },
        [focusSource],
    );

    return {
        focusFinalPageSource,
        focusFinalPageInDocument,
    };
}
