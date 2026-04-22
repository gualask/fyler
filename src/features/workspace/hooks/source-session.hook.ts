import { useCallback, useReducer } from 'react';
import { buildThumbnailRenderRequest, usePdfCache } from '@/infra/pdf';
import { openFilesDialog, releaseSources } from '@/infra/platform';
import type { RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { useTranslation } from '@/shared/i18n';
import { initialSourceSessionState, sourceSessionReducer } from '../state/source-session.reducer';

interface Options {
    onFilesAdded?: (files: SourceFile[]) => void;
    onFileRemoved?: (file: SourceFile | null) => void;
}

export function useSourceSession({ onFilesAdded, onFileRemoved }: Options) {
    const { t } = useTranslation();
    const [state, dispatch] = useReducer(sourceSessionReducer, initialSourceSessionState);
    const { files, editsByFile } = state;
    const { requestRenders, releaseFile } = usePdfCache();

    const addSourceFiles = useCallback(
        (newFiles: SourceFile[]) => {
            if (!newFiles.length) return [];

            dispatch({ type: 'add-files', files: newFiles });
            onFilesAdded?.(newFiles);
            return newFiles;
        },
        [onFilesAdded],
    );

    const openAndAddSourceFiles = useCallback(async () => {
        const result = await openFilesDialog(t('dialogs.filters.documentsAndImages'));
        const added = result.files.length ? addSourceFiles(result.files) : [];
        return { files: added, skippedErrors: result.skippedErrors };
    }, [addSourceFiles, t]);

    const removeSourceFile = useCallback(
        (id: string) => {
            const removed = files.find((file) => file.id === id) ?? null;
            if (removed?.kind === 'pdf') {
                releaseFile(id);
            }
            void releaseSources([id]);
            dispatch({ type: 'remove-file', fileId: id });
            onFileRemoved?.(removed);
            return removed;
        },
        [files, onFileRemoved, releaseFile],
    );

    const clearSourceFiles = useCallback(() => {
        if (!files.length) return;

        for (const file of files) {
            if (file.kind === 'pdf') {
                releaseFile(file.id);
            }
        }
        void releaseSources(files.map((file) => file.id));
        dispatch({ type: 'clear' });
    }, [files, releaseFile]);

    const reorderFiles = useCallback((fromId: string, toId: string) => {
        dispatch({ type: 'reorder-files', fromId, toId });
    }, []);

    const updateFilePageCount = useCallback((id: string, count: number) => {
        dispatch({ type: 'update-file-page-count', fileId: id, count });
    }, []);

    const rotateSourcePage = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            const file = files.find((entry) => entry.id === fileId);
            if (!file) return;

            if (file.kind === 'pdf' && target.kind !== 'pdf') return;
            if (file.kind === 'image' && target.kind !== 'image') return;

            const nextEdits = FileEditsVO.applyRotation(editsByFile[file.id], target, direction);
            dispatch({ type: 'set-file-edits', fileId: file.id, edits: nextEdits });
            if (file.kind === 'pdf' && target.kind === 'pdf') {
                requestRenders(file, [buildThumbnailRenderRequest(target.pageNum, nextEdits)]);
            }
        },
        [editsByFile, files, requestRenders],
    );

    return {
        files,
        editsByFile,
        addSourceFiles,
        openAndAddSourceFiles,
        removeSourceFile,
        clearSourceFiles,
        rotateSourcePage,
        reorderFiles,
        updateFilePageCount,
    };
}
