import { useCallback } from 'react';

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

export function useTutorialFilesAddedHandler({ tutorial }: { tutorial: TutorialLike }) {
    const { requestAutoStart } = tutorial;

    return useCallback(
        ({ ids, wasWorkspaceEmpty }: TutorialFilesAddedEvent) => {
            if (shouldRequestTutorialAutoStart({ ids, wasWorkspaceEmpty })) {
                requestAutoStart();
            }
        },
        [requestAutoStart],
    );
}
