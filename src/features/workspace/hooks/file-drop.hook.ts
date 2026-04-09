import { useEffect, useLayoutEffect, useRef, useState } from 'react';

import { openFilesFromPaths } from '@/infra/platform';
import { onTauriEvent } from '@/infra/platform/events';
import type { SourceFile } from '@/shared/domain';

interface DragDropPayload {
    paths: string[];
}

export function useFileDrop(
    addFiles: (files: SourceFile[]) => Promise<SourceFile[]> | SourceFile[],
    setSelectedId: (id: string) => void,
    onError: (error: unknown) => void,
): { isDragOver: boolean } {
    const [isDragOver, setIsDragOver] = useState(false);
    const addFilesRef = useRef(addFiles);
    const setSelectedIdRef = useRef(setSelectedId);
    const onErrorRef = useRef(onError);
    useLayoutEffect(() => {
        addFilesRef.current = addFiles;
        setSelectedIdRef.current = setSelectedId;
        onErrorRef.current = onError;
    });

    useEffect(() => {
        let active = true;
        const unlisteners = [
            onTauriEvent<DragDropPayload>('tauri://drag-enter', (e) => {
                if (e.payload.paths?.length) setIsDragOver(true);
            }),
            onTauriEvent<DragDropPayload>('tauri://drag-over', (e) => {
                if (e.payload.paths?.length) setIsDragOver(true);
            }),
            onTauriEvent('tauri://drag-leave', () => setIsDragOver(false)),
            onTauriEvent<DragDropPayload>('tauri://drag-drop', (e) => {
                setIsDragOver(false);
                const paths = e.payload.paths;
                if (!paths?.length) return;
                void openFilesFromPaths(paths)
                    .then((result) => {
                        if (!active || !result.files.length) return;
                        void Promise.resolve(addFilesRef.current(result.files)).then(
                            (addedFiles) => {
                                if (!active || !addedFiles.length) return;
                                setSelectedIdRef.current(addedFiles[0].id);
                            },
                        );
                    })
                    .catch((error) => {
                        if (active) onErrorRef.current(error);
                    });
            }),
        ];

        return () => {
            active = false;
            for (const fn of unlisteners) fn();
        };
    }, []); // listeners registered once on mount

    return { isDragOver };
}
