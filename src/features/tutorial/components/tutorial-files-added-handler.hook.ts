import { useCallback } from 'react';

type QuickAddLike = {
    onFilesAdded: (ids: string[]) => void;
    isQuickAdd: boolean;
    isTransitioning: boolean;
};

type TutorialLike = {
    requestAutoStart: () => void;
};

export interface TutorialFilesAddedEvent {
    ids: string[];
    wasWorkspaceEmpty: boolean;
}

export function shouldRequestTutorialAutoStart({
    ids,
    wasWorkspaceEmpty,
}: TutorialFilesAddedEvent): boolean {
    return ids.length > 0 && wasWorkspaceEmpty;
}

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
        ({ ids, wasWorkspaceEmpty }: TutorialFilesAddedEvent) => {
            onQuickAddFilesAdded(ids);
            if (shouldRequestTutorialAutoStart({ ids, wasWorkspaceEmpty })) {
                requestAutoStart();
            }
        },
        [onQuickAddFilesAdded, requestAutoStart],
    );
}
