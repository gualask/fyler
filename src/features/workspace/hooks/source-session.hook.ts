import { useCallback } from 'react';
import { buildThumbnailRenderRequest, usePdfCache } from '@/infra/pdf';
import { openFilesDialog, releaseSources } from '@/infra/platform';
import type { RotationDirection, SourceFile, SourceTarget } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { useTranslation } from '@/shared/i18n';
import { useFileEdits } from './file-edits.hook';
import type { useFileList } from './file-list.hook';

interface Options {
    fileList: ReturnType<typeof useFileList>;
    onFilesAdded?: (files: SourceFile[]) => void;
    onFileRemoved?: (file: SourceFile | null) => void;
}

export function useSourceSession({ fileList, onFilesAdded, onFileRemoved }: Options) {
    const { t } = useTranslation();
    const {
        files,
        addFiles: addToList,
        removeFile: removeFileFromList,
        clearFiles,
        reorderFiles,
        updateFilePageCount,
    } = fileList;
    const { editsByFile, setFileEdits, clearFileEdits, clearAllFileEdits } = useFileEdits();
    const { requestRenders, releaseFile } = usePdfCache();

    const addSourceFiles = useCallback(
        (newFiles: SourceFile[]) => {
            if (!newFiles.length) return [];

            addToList(newFiles);
            onFilesAdded?.(newFiles);
            return newFiles;
        },
        [addToList, onFilesAdded],
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
            clearFileEdits(id);
            void releaseSources([id]);
            removeFileFromList(id);
            onFileRemoved?.(removed);
            return removed;
        },
        [clearFileEdits, files, onFileRemoved, releaseFile, removeFileFromList],
    );

    const clearSourceFiles = useCallback(() => {
        if (!files.length) return;

        for (const file of files) {
            if (file.kind === 'pdf') {
                releaseFile(file.id);
            }
        }
        clearAllFileEdits();
        void releaseSources(files.map((file) => file.id));
        clearFiles();
    }, [clearAllFileEdits, clearFiles, files, releaseFile]);

    const rotateSourcePage = useCallback(
        async (fileId: string, target: SourceTarget, direction: RotationDirection) => {
            const file = files.find((entry) => entry.id === fileId);
            if (!file) return;

            if (file.kind === 'pdf' && target.kind !== 'pdf') return;
            if (file.kind === 'image' && target.kind !== 'image') return;

            const nextEdits = FileEditsVO.applyRotation(editsByFile[file.id], target, direction);
            setFileEdits(file.id, nextEdits);
            if (file.kind === 'pdf' && target.kind === 'pdf') {
                requestRenders(file, [buildThumbnailRenderRequest(target.pageNum, nextEdits)]);
            }
        },
        [editsByFile, files, requestRenders, setFileEdits],
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
