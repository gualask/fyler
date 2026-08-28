import { useCallback } from 'react';
import type { SourceTarget } from '@/capabilities/document-sources';
import type { FocusFlashTarget } from '../../model/workspace.store';

export function useWorkspaceFocusActions(
    focusSourceAction: (
        fileId: string,
        target: SourceTarget,
        flashTarget: FocusFlashTarget,
    ) => void,
) {
    const focusFinalPageSource = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSourceAction(fileId, target, 'picker');
        },
        [focusSourceAction],
    );

    const focusFinalPageInDocument = useCallback(
        (fileId: string, target: SourceTarget) => {
            focusSourceAction(fileId, target, 'final');
        },
        [focusSourceAction],
    );

    return {
        focusFinalPageSource,
        focusFinalPageInDocument,
    };
}
