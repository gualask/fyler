import type { Dispatch, SetStateAction } from 'react';
import { useEffect, useMemo } from 'react';
import type { WorkspaceApi } from '@/features/workspace';
import {
    type CompositionState,
    createWorkspaceStore,
} from '@/features/workspace/state/workspace.store';
import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import { useWorkspaceFixtureFileActions } from './workspace-fixture-file-actions.hook';
import { useWorkspaceFixturePageActions } from './workspace-fixture-page-actions.hook';

function compositionFromFinalPages(finalPages: FinalPage[]): CompositionState {
    const selectedPdfPagesByFile: CompositionState['selectedPdfPagesByFile'] = {};
    const includedImagesByFile: CompositionState['includedImagesByFile'] = {};

    for (const page of finalPages) {
        if (page.kind === 'image') {
            includedImagesByFile[page.fileId] = true;
            continue;
        }
        selectedPdfPagesByFile[page.fileId] = [
            ...(selectedPdfPagesByFile[page.fileId] ?? []),
            page.pageNum,
        ];
    }

    return {
        selectedPdfPagesByFile,
        includedImagesByFile,
        pageOrder: finalPages.map((page) => page.id),
    };
}

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
    const store = useMemo(() => createWorkspaceStore(), []);
    const fileActions = useWorkspaceFixtureFileActions({
        files,
        setFiles,
        setSelectedId,
        setFinalPages,
        setEditsByFile,
    });
    const pageActions = useWorkspaceFixturePageActions({ setFinalPages });

    useEffect(() => {
        store.setState({
            source: { files, editsByFile },
            composition: compositionFromFinalPages(finalPages),
            ui: {
                selectedId,
                selectedFileScrollKey: undefined,
                focusedSource: null,
                uiSignalKey: 0,
            },
        });
    }, [editsByFile, files, finalPages, selectedId, store]);

    return useMemo(
        () =>
            ({
                store,
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
        [editsByFile, fileActions, files, finalPages, pageActions, selectedFile, selectedId, store],
    );
}
