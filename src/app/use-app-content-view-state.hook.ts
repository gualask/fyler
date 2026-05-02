import { useEffect } from 'react';
import type { FinalPage, SourceFile, SourceTarget } from '@/shared/domain';
import {
    buildAppContentRootClassName,
    deriveFocusedSourceState,
    isTutorialReadyForAutoStart,
} from './app-content.selectors';

type QuickAddLike = {
    isQuickAdd: boolean;
    isTransitioning: boolean;
};

type TutorialLike = {
    maybeAutoStart: (isReady: boolean) => void;
};

type FocusedSourceLike = {
    target: SourceTarget;
    flashTarget: 'picker' | 'final';
    flashKey: number;
    fileId: string;
} | null;

type WorkspaceLike = {
    files: SourceFile[];
    finalPages: FinalPage[];
    selectedFile: Pick<SourceFile, 'id'> | null;
    focusedSource: FocusedSourceLike;
};

export function useAppContentViewState({
    quickAdd,
    tutorial,
    workspace,
}: {
    quickAdd: QuickAddLike;
    tutorial: TutorialLike;
    workspace: WorkspaceLike;
}) {
    const { focusedSourceTarget, focusedSourceFlashKey } = deriveFocusedSourceState({
        focusedSource: workspace.focusedSource,
        selectedFile: workspace.selectedFile,
    });
    const isTutorialReady = isTutorialReadyForAutoStart(quickAdd, workspace);

    useEffect(() => {
        tutorial.maybeAutoStart(isTutorialReady);
    }, [isTutorialReady, tutorial.maybeAutoStart]);

    return {
        focusedSourceTarget,
        focusedSourceFlashKey,
        rootClassName: buildAppContentRootClassName(quickAdd.isTransitioning),
    };
}
