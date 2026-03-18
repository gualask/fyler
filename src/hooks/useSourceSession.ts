import { useCallback } from 'react';

import type { RotationDirection } from '../fileEdits';
import { applyRotationToEdits } from '../fileEdits';
import type { SourceFile } from '../domain';
import { useTranslation } from '../i18n';
import { buildThumbnailRenderRequest } from '../pdfRenderProfiles';
import { openFilesDialog, releaseSources } from '../platform';
import { usePdfCache } from './usePdfCache';
import { useFileEdits } from './useFileEdits';
import { useFileList } from './useFileList';

interface Options {
    onFilesAdded?: (files: SourceFile[]) => void;
    onFileRemoved?: (file: SourceFile | null) => void;
}

export function useSourceSession({ onFilesAdded, onFileRemoved }: Options = {}) {
    const { t } = useTranslation();
    const { files, addFiles: addToList, removeFile: removeFileFromList, clearFiles, reorderFiles } = useFileList();
    const { editsByFile, setFileEdits, clearFileEdits, clearAllFileEdits } = useFileEdits();
    const { requestRenders, releaseFile } = usePdfCache();

    const addSourceFiles = useCallback((newFiles: SourceFile[]) => {
        if (!newFiles.length) return [];

        addToList(newFiles);
        onFilesAdded?.(newFiles);
        return newFiles;
    }, [addToList, onFilesAdded]);

    const openAndAddSourceFiles = useCallback(async () => {
        const newFiles = await openFilesDialog(t('dialogs.filters.documentsAndImages'));
        if (!newFiles.length) return [];
        return addSourceFiles(newFiles);
    }, [addSourceFiles, t]);

    const removeSourceFile = useCallback((id: string) => {
        const removed = files.find((file) => file.id === id) ?? null;
        if (removed?.kind === 'pdf') {
            releaseFile(id);
        }
        clearFileEdits(id);
        void releaseSources([id]);
        removeFileFromList(id);
        onFileRemoved?.(removed);
        return removed;
    }, [clearFileEdits, files, onFileRemoved, releaseFile, removeFileFromList]);

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

    const rotateSourcePage = useCallback(async (fileId: string, pageNum: number, direction: RotationDirection) => {
        const file = files.find((entry) => entry.id === fileId);
        if (!file) return;

        const nextEdits = applyRotationToEdits(editsByFile[file.id], file.kind, pageNum, direction);
        setFileEdits(file.id, nextEdits);
        if (file.kind === 'pdf') {
            requestRenders(file, [buildThumbnailRenderRequest(pageNum, nextEdits)]);
        }
    }, [editsByFile, files, requestRenders, setFileEdits]);

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
