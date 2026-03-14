import { useCallback, useEffect, useRef } from 'react';

import type { RotationDirection } from '../fileEdits';
import { applyRotationToEdits, emptyFileEdits } from '../fileEdits';
import type { SourceFile } from '../domain';
import { useTranslation } from '../i18n';
import { buildThumbnailRenderRequest, buildThumbnailRenderRequests } from '../pdfRenderProfiles';
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
    const { files, addFiles: addToList, removeFile: removeFileFromList, reorderFiles } = useFileList();
    const { editsByFile, setFileEdits, clearFileEdits } = useFileEdits();
    const { requestRenders, releaseFile } = usePdfCache();
    const knownPathsRef = useRef<Set<string>>(new Set());

    useEffect(() => {
        knownPathsRef.current = new Set(files.map((file) => file.originalPath));
    }, [files]);

    const addSourceFiles = useCallback((newFiles: SourceFile[]) => {
        const knownPaths = new Set(knownPathsRef.current);
        const duplicateIds: string[] = [];
        const uniqueFiles = newFiles.filter((file) => {
            if (knownPaths.has(file.originalPath)) {
                duplicateIds.push(file.id);
                return false;
            }
            knownPaths.add(file.originalPath);
            return true;
        });
        knownPathsRef.current = knownPaths;
        if (duplicateIds.length) {
            void releaseSources(duplicateIds);
        }
        if (!uniqueFiles.length) return [];

        addToList(uniqueFiles);
        for (const file of uniqueFiles) {
            if (file.kind === 'pdf') {
                requestRenders(
                    file,
                    buildThumbnailRenderRequests(
                        Array.from({ length: file.pageCount }, (_, index) => index + 1),
                        emptyFileEdits(),
                    ),
                );
            }
        }

        onFilesAdded?.(uniqueFiles);
        return uniqueFiles;
    }, [addToList, onFilesAdded, requestRenders]);

    const openAndAddSourceFiles = useCallback(async () => {
        const newFiles = await openFilesDialog(t('dialogs.filters.documentsAndImages'));
        if (!newFiles.length) return [];
        return addSourceFiles(newFiles);
    }, [addSourceFiles, t]);

    const removeSourceFile = useCallback((id: string) => {
        const removed = files.find((file) => file.id === id) ?? null;
        if (removed) {
            const knownPaths = new Set(knownPathsRef.current);
            knownPaths.delete(removed.originalPath);
            knownPathsRef.current = knownPaths;
        }
        if (removed?.kind === 'pdf') {
            releaseFile(id);
        }
        clearFileEdits(id);
        void releaseSources([id]);
        removeFileFromList(id);
        onFileRemoved?.(removed);
        return removed;
    }, [clearFileEdits, files, onFileRemoved, releaseFile, removeFileFromList]);

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
        rotateSourcePage,
        reorderFiles,
    };
}
