import { useCallback } from 'react';

type QuickAddLike = {
    onFilesAdded: (ids: string[]) => void;
    isQuickAdd: boolean;
    isTransitioning: boolean;
};

type TutorialLike = {
    maybeAutoStartAfterFilesAdded: () => void;
};

export function useTutorialFilesAddedHandler({
    quickAdd,
    tutorial,
}: {
    quickAdd: QuickAddLike;
    tutorial: TutorialLike;
}) {
    const { onFilesAdded: onQuickAddFilesAdded, isQuickAdd, isTransitioning } = quickAdd;
    const { maybeAutoStartAfterFilesAdded } = tutorial;

    return useCallback(
        (ids: string[]) => {
            onQuickAddFilesAdded(ids);
            if (!isQuickAdd && !isTransitioning) {
                maybeAutoStartAfterFilesAdded();
            }
        },
        [isQuickAdd, isTransitioning, maybeAutoStartAfterFilesAdded, onQuickAddFilesAdded],
    );
}
