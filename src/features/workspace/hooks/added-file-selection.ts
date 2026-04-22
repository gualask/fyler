import type { SourceFile, SourceTarget } from '@/shared/domain';

type PreserveSelectionIntent = {
    kind: 'preserve';
};

type SelectFileIntent = {
    kind: 'select-file';
    fileId: string;
};

type FocusSourceIntent = {
    kind: 'focus-source';
    fileId: string;
    target: SourceTarget;
    flashTarget: 'final';
};

export type SelectionAfterAddIntent =
    | PreserveSelectionIntent
    | SelectFileIntent
    | FocusSourceIntent;

export function resolveSelectionAfterAdd(
    currentSelectedId: string | null,
    addedFiles: Pick<SourceFile, 'id' | 'kind'>[],
): SelectionAfterAddIntent {
    if (!addedFiles.length) {
        return { kind: 'preserve' };
    }

    if (addedFiles.length === 1) {
        const [addedFile] = addedFiles;
        if (addedFile.kind === 'image') {
            return {
                kind: 'focus-source',
                fileId: addedFile.id,
                target: { kind: 'image' },
                flashTarget: 'final',
            };
        }

        return { kind: 'select-file', fileId: addedFile.id };
    }

    if (currentSelectedId) {
        return { kind: 'preserve' };
    }

    return { kind: 'select-file', fileId: addedFiles[0].id };
}
