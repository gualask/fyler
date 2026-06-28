import { type Dispatch, useCallback } from 'react';
import type { SourceTarget } from '@/shared/domain';
import type { WorkspaceUiAction } from '../../state/workspace-ui.reducer';

type FocusFlashTarget = 'picker' | 'final';

function useFocusSource(dispatchUi: Dispatch<WorkspaceUiAction>) {
    return useCallback(
        (fileId: string, target: SourceTarget, flashTarget: FocusFlashTarget) => {
            dispatchUi({
                type: 'source-focused',
                fileId,
                target,
                flashTarget,
            });
        },
        [dispatchUi],
    );
}

export function useWorkspaceFocusActions(dispatchUi: Dispatch<WorkspaceUiAction>) {
    const focusSource = useFocusSource(dispatchUi);

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
