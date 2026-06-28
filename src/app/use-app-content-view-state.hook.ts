import { useEffect } from 'react';
import type { FinalPage, SourceFile } from '@/shared/domain';
import { buildAppContentRootClassName, isTutorialReadyForAutoStart } from './app-content.selectors';

type QuickAddLike = {
    isQuickAdd: boolean;
    isTransitioning: boolean;
};

type TutorialLike = {
    maybeAutoStart: (isReady: boolean) => void;
};

type WorkspaceLike = {
    files: SourceFile[];
    finalPages: FinalPage[];
    selectedFile: Pick<SourceFile, 'id'> | null;
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
    const isTutorialReady = isTutorialReadyForAutoStart(quickAdd, workspace);

    useEffect(() => {
        tutorial.maybeAutoStart(isTutorialReady);
    }, [isTutorialReady, tutorial.maybeAutoStart]);

    return {
        rootClassName: buildAppContentRootClassName(quickAdd.isTransitioning),
    };
}
