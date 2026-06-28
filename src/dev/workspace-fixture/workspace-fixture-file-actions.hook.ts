import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import type { WorkspaceApi } from '@/features/workspace';
import type {
    FileEdits,
    FinalPage,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';

const CLOSED_PASSWORD_DIALOG = {
    open: false,
    file: null,
    currentIndex: 0,
    totalCount: 0,
    password: '',
    error: null,
    isChecking: false,
    tryForRemaining: false,
    onPasswordChange: () => undefined,
    onTryForRemainingChange: () => undefined,
    onSubmit: () => undefined,
    onSkipCurrent: () => undefined,
    onSkipAll: () => undefined,
} satisfies WorkspaceApi['passwordDialog'];

export function useWorkspaceFixtureFileActions({
    files,
    setFiles,
    setSelectedId,
    setFinalPages,
    setEditsByFile,
}: {
    files: SourceFile[];
    setFiles: Dispatch<SetStateAction<SourceFile[]>>;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
    setFinalPages: Dispatch<SetStateAction<FinalPage[]>>;
    setEditsByFile: Dispatch<SetStateAction<Record<string, FileEdits>>>;
}) {
    return useMemo(
        () => ({
            selectFile: (id: string) => {
                setSelectedId(id);
            },
            addFiles: async () => ({ files: [], skippedErrors: [] }),
            passwordDialog: CLOSED_PASSWORD_DIALOG,
            removeFile: (id: string) => {
                setFiles((current) => current.filter((file) => file.id !== id));
                setFinalPages((current) => current.filter((page) => page.fileId !== id));
                setSelectedId((current) => {
                    if (current !== id) return current;
                    const remaining = files.filter((file) => file.id !== id);
                    return remaining[0]?.id ?? null;
                });
            },
            removeFiles: (ids: readonly string[]) => {
                const idsToRemove = new Set(ids);
                setFiles((current) => current.filter((file) => !idsToRemove.has(file.id)));
                setFinalPages((current) => current.filter((page) => !idsToRemove.has(page.fileId)));
                setSelectedId((current) => {
                    if (!current || !idsToRemove.has(current)) return current;
                    const remaining = files.filter((file) => !idsToRemove.has(file.id));
                    return remaining[0]?.id ?? null;
                });
            },
            clearAllFiles: () => {
                setFiles([]);
                setSelectedId(null);
                setFinalPages([]);
            },
            rotatePage: async (
                fileId: string,
                target: SourceTarget,
                direction: RotationDirection,
            ) => {
                setEditsByFile((current) => ({
                    ...current,
                    [fileId]: FileEditsVO.applyRotation(current[fileId], target, direction),
                }));
            },
            focusFinalPageSource: (fileId: string, _target: SourceTarget) => setSelectedId(fileId),
            focusFinalPageInDocument: (fileId: string, _target: SourceTarget) =>
                setSelectedId(fileId),
            reorderFiles: (_fromId: string, _toId: string) => undefined,
            isDragOver: false,
        }),
        [files, setEditsByFile, setFiles, setFinalPages, setSelectedId],
    );
}
