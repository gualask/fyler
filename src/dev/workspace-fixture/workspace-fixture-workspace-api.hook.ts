import type { Dispatch, SetStateAction } from 'react';
import { useMemo } from 'react';
import type { WorkspaceApi } from '@/features/workspace';
import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import { useWorkspaceFixtureFileActions } from './workspace-fixture-file-actions.hook';
import { useWorkspaceFixturePageActions } from './workspace-fixture-page-actions.hook';

export function useWorkspaceFixtureWorkspaceApi({
    files,
    setFiles,
    selectedId,
    setSelectedId,
    selectedFile,
    finalPages,
    setFinalPages,
    editsByFile,
    setEditsByFile,
}: {
    files: SourceFile[];
    setFiles: Dispatch<SetStateAction<SourceFile[]>>;
    selectedId: string | null;
    setSelectedId: Dispatch<SetStateAction<string | null>>;
    selectedFile: SourceFile | null;
    finalPages: FinalPage[];
    setFinalPages: Dispatch<SetStateAction<FinalPage[]>>;
    editsByFile: Record<string, FileEdits>;
    setEditsByFile: Dispatch<SetStateAction<Record<string, FileEdits>>>;
}): WorkspaceApi {
    const fileActions = useWorkspaceFixtureFileActions({
        files,
        setFiles,
        setSelectedId,
        setFinalPages,
        setEditsByFile,
    });
    const pageActions = useWorkspaceFixturePageActions({ setFinalPages });

    return useMemo(
        () =>
            ({
                files,
                editsByFile,
                selectedId,
                selectedFileScrollKey: undefined,
                selectedFile,
                focusedSource: null,
                finalPages,
                selectedPdfPagesByFile: {},
                includedImagesByFile: {},
                ...fileActions,
                ...pageActions,
            }) satisfies Partial<WorkspaceApi> as WorkspaceApi,
        [editsByFile, fileActions, files, finalPages, pageActions, selectedFile, selectedId],
    );
}
