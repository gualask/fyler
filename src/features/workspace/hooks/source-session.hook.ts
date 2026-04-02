import { useCallback } from 'react';
import { buildThumbnailRenderRequest, usePdfCache } from '@/infra/pdf';
import { openFilesDialog, releaseSources } from '@/infra/platform';
import type { SourceFile } from '@/shared/domain';
import type { RotationDirection } from '@/shared/domain/file-edits';
import { applyRotationToEdits } from '@/shared/domain/file-edits';
import { useTranslation } from '@/shared/i18n';
import { useFileEdits } from './file-edits.hook';
import { useFileList } from './file-list.hook';

interface Options {
    onFilesAdded?: (files: SourceFile[]) => void;
    onFileRemoved?: (file: SourceFile | null) => void;
}

export function useSourceSession({ onFilesAdded, onFileRemoved }: Options = {}) {
    const { t } = useTranslation();
    const {
        files,
        addFiles: addToList,
        removeFile: removeFileFromList,
        clearFiles,
        reorderFiles,
    } = useFileList();
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
        async (fileId: string, pageNum: number, direction: RotationDirection) => {
            const file = files.find((entry) => entry.id === fileId);
            if (!file) return;

            const nextEdits = applyRotationToEdits(
                editsByFile[file.id],
                file.kind,
                pageNum,
                direction,
            );
            setFileEdits(file.id, nextEdits);
            if (file.kind === 'pdf') {
                requestRenders(file, [buildThumbnailRenderRequest(pageNum, nextEdits)]);
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
    };
}
