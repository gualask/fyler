import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { openFilesFromPaths } from '../platform';
import type { SourceFile } from '../domain';

interface DragDropPayload {
    paths: string[];
}

export function useFileDrop(
    addFiles: (files: SourceFile[]) => void,
    setSelectedId: (id: string) => void,
): { isDragOver: boolean } {
    const [isDragOver, setIsDragOver] = useState(false);

    useEffect(() => {
        let active = true;
        const unlisteners: Array<() => void> = [];

        void Promise.all([
            listen<DragDropPayload>('tauri://drag-enter', (e) => { if (e.payload.paths?.length) setIsDragOver(true); }),
            listen<DragDropPayload>('tauri://drag-over', (e) => { if (e.payload.paths?.length) setIsDragOver(true); }),
            listen('tauri://drag-leave', () => setIsDragOver(false)),
            listen<DragDropPayload>('tauri://drag-drop', (e) => {
                setIsDragOver(false);
                const paths = e.payload.paths;
                if (!paths?.length) return;
                void openFilesFromPaths(paths).then((files) => {
                    if (!files.length) return;
                    addFiles(files);
                    setSelectedId(files[0].id);
                });
            }),
        ]).then((fns) => {
            if (active) {
                unlisteners.push(...fns);
            } else {
                fns.forEach((fn) => fn());
            }
        });

        return () => {
            active = false;
            unlisteners.forEach((fn) => fn());
        };
    }, [addFiles, setSelectedId]);

    return { isDragOver };
}
