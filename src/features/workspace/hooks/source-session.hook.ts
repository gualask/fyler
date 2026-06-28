import { useCallback } from 'react';
import { useStore } from 'zustand';
import { buildThumbnailRenderRequest, usePdfCache } from '@/infra/pdf';
import { openFilesDialog, releaseSources } from '@/infra/platform';
import type { OpenFilesResult, RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import type { WorkspaceStoreApi } from '../state/workspace.store';

type RequestRenders = ReturnType<typeof usePdfCache>['requestRenders'];
type ReleaseFile = ReturnType<typeof usePdfCache>['releaseFile'];

function releasePdfSource(file: SourceFile | null, releaseFile: ReleaseFile) {
    if (file?.kind === 'pdf') {
        releaseFile(file.id);
    }
}

function releasePdfSources(files: SourceFile[], releaseFile: ReleaseFile) {
    for (const file of files) {
        releasePdfSource(file, releaseFile);
    }
}

function requestPdfThumbnailRender({
    file,
    target,
    requestRenders,
    edits,
}: {
    file: SourceFile;
    target: SourceTarget;
    requestRenders: RequestRenders;
    edits: Parameters<typeof buildThumbnailRenderRequest>[1];
}) {
    if (file.kind !== 'pdf' || target.kind !== 'pdf') return;
    requestRenders(file, [buildThumbnailRenderRequest(target.pageNum, edits)]);
}

export function useSourceSession(store: WorkspaceStoreApi) {
    const { t } = useTranslation();
    const files = useStore(store, (state) => state.source.files);
    const editsByFile = useStore(store, (state) => state.source.editsByFile);
    const addSourceFilesState = useStore(store, (state) => state.addSourceFiles);
    const removeSourceFilesState = useStore(store, (state) => state.removeSourceFiles);
    const clearSourceFilesState = useStore(store, (state) => state.clearSourceFiles);
    const reorderFiles = useStore(store, (state) => state.reorderFiles);
    const updateFilePageCount = useStore(store, (state) => state.updateFilePageCount);
    const rotateSourcePageState = useStore(store, (state) => state.rotateSourcePage);
    const { requestRenders, releaseFile } = usePdfCache();

    const openSourceFiles = useCallback(async (): Promise<OpenFilesResult> => {
        return openFilesDialog(t('dialogs.filters.documentsAndImages'));
    }, [t]);

    const removeSourceFiles = useCallback(
        (ids: readonly string[]) => {
            const { removedFiles, remainingIds } = removeSourceFilesState(ids);
            if (removedFiles.length) {
                releasePdfSources(removedFiles, releaseFile);
                void releaseSources(removedFiles.map((file) => file.id));
            }
            return { removedFiles, remainingIds };
        },
        [releaseFile, removeSourceFilesState],
    );

    const removeSourceFile = useCallback(
        (id: string) => {
            const { removedFiles, remainingIds } = removeSourceFiles([id]);
            return { removed: removedFiles[0] ?? null, remainingIds };
        },
        [removeSourceFiles],
    );

    const clearSourceFiles = useCallback(() => {
        const removedFiles = clearSourceFilesState();
        if (!removedFiles.length) return [];

        releasePdfSources(removedFiles, releaseFile);
        void releaseSources(removedFiles.map((file) => file.id));
        return removedFiles;
    }, [clearSourceFilesState, releaseFile]);

    const rotateSourcePage = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            const rotation = rotateSourcePageState(fileId, target, direction);
            if (!rotation) return;

            requestPdfThumbnailRender({
                file: rotation.file,
                target: rotation.target,
                requestRenders,
                edits: rotation.edits,
            });
        },
        [requestRenders, rotateSourcePageState],
    );

    return {
        files,
        editsByFile,
        addSourceFiles: addSourceFilesState,
        openSourceFiles,
        removeSourceFile,
        removeSourceFiles,
        clearSourceFiles,
        rotateSourcePage,
        reorderFiles,
        updateFilePageCount,
    };
}
