import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { OpenFilesResult, SourceFile } from '@/capabilities/document-sources';
import { useDocumentSourcesPort } from '@/capabilities/document-sources/source.port';

interface DroppedFileImportRunnerDeps {
    openFiles: (paths: string[]) => Promise<OpenFilesResult>;
    addFiles: (result: OpenFilesResult) => Promise<SourceFile[]> | SourceFile[];
    onError: (error: unknown) => void;
    beginImport: () => boolean;
    finishImport: () => void;
    isActive: () => boolean;
}

export function createDroppedFileImportRunner({
    openFiles,
    addFiles,
    onError,
    beginImport,
    finishImport,
    isActive,
}: DroppedFileImportRunnerDeps) {
    let importInFlight = false;

    return async (paths: string[]): Promise<boolean> => {
        if (paths.length === 0 || importInFlight) return false;

        importInFlight = true;
        let importStarted = false;
        let feedbackFinished = false;
        const finishFeedback = () => {
            if (feedbackFinished || !isActive()) return;
            feedbackFinished = true;
            finishImport();
        };

        try {
            if (!beginImport()) return false;
            importStarted = true;

            const result = await openFiles(paths);
            if (!isActive()) return true;

            // Native file processing has finished. Resolve protected PDFs after the progress
            // modal closes, matching the system-picker flow.
            finishFeedback();
            if (result.files.length === 0 && result.passwordRequired.length === 0) return true;

            await addFiles(result);
            return true;
        } catch (error) {
            if (isActive()) onError(error);
            return true;
        } finally {
            importInFlight = false;
            if (importStarted) finishFeedback();
        }
    };
}

export function useFileDrop(
    addFiles: (result: OpenFilesResult) => Promise<SourceFile[]> | SourceFile[],
    onError: (error: unknown) => void,
    {
        beginImport = () => true,
        finishImport = () => undefined,
    }: {
        beginImport?: () => boolean;
        finishImport?: () => void;
    } = {},
): { isDragOver: boolean } {
    const documentSources = useDocumentSourcesPort();
    const [isDragOver, setIsDragOver] = useState(false);
    const addFilesRef = useRef(addFiles);
    const onErrorRef = useRef(onError);
    const beginImportRef = useRef(beginImport);
    const finishImportRef = useRef(finishImport);
    useLayoutEffect(() => {
        addFilesRef.current = addFiles;
        onErrorRef.current = onError;
        beginImportRef.current = beginImport;
        finishImportRef.current = finishImport;
    });

    useEffect(() => {
        let active = true;
        const importDroppedFiles = createDroppedFileImportRunner({
            openFiles: (paths) => documentSources.openFilesFromPaths(paths),
            addFiles: (result) => addFilesRef.current(result),
            onError: (error) => onErrorRef.current(error),
            beginImport: () => beginImportRef.current(),
            finishImport: () => finishImportRef.current(),
            isActive: () => active,
        });
        const unlisten = documentSources.listenForFileDrag((event) => {
            if (event.type === 'enter' || event.type === 'over') {
                setIsDragOver(true);
                return;
            }
            if (event.type === 'leave') {
                setIsDragOver(false);
                return;
            }
            if (event.type !== 'drop') return;
            setIsDragOver(false);
            if (event.paths.length > 0) void importDroppedFiles(event.paths);
        });

        return () => {
            active = false;
            unlisten();
        };
    }, [documentSources]);

    return { isDragOver };
}
