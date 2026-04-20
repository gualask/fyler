import { useCallback } from 'react';

type QuickAddLike = {
    onFilesAdded: (ids: string[]) => void;
    isQuickAdd: boolean;
    isTransitioning: boolean;
};

type TutorialLike = {
    requestAutoStart: () => void;
};

export function useTutorialFilesAddedHandler({
    quickAdd,
    tutorial,
}: {
    quickAdd: QuickAddLike;
    tutorial: TutorialLike;
}) {
    const { onFilesAdded: onQuickAddFilesAdded } = quickAdd;
    const { requestAutoStart } = tutorial;

    return useCallback(
        (ids: string[]) => {
            onQuickAddFilesAdded(ids);
            requestAutoStart();
        },
        [onQuickAddFilesAdded, requestAutoStart],
    );
}
