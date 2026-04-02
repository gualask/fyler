import { listen } from '@tauri-apps/api/event';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { openFilesFromPaths } from '@/infra/platform';
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
        const unlisteners: Array<() => void> = [];

        void Promise.all([
            listen<DragDropPayload>('tauri://drag-enter', (e) => {
                if (e.payload.paths?.length) setIsDragOver(true);
            }),
            listen<DragDropPayload>('tauri://drag-over', (e) => {
                if (e.payload.paths?.length) setIsDragOver(true);
            }),
            listen('tauri://drag-leave', () => setIsDragOver(false)),
            listen<DragDropPayload>('tauri://drag-drop', (e) => {
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
        ]).then((fns) => {
            if (active) {
                unlisteners.push(...fns);
            } else {
                for (const fn of fns) fn();
            }
        });

        return () => {
            active = false;
            for (const fn of unlisteners) fn();
        };
    }, []); // listener registrati una sola volta al mount

    return { isDragOver };
}
