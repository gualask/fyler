import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { openDocsFromPaths } from '../platform';
import type { Doc } from '../domain';

interface DragDropPayload {
    paths: string[];
}

export function useFileDrop(
    addDocs: (docs: Doc[]) => void,
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
                void openDocsFromPaths(paths).then((docs) => {
                    if (!docs.length) return;
                    addDocs(docs);
                    setSelectedId(docs[0].id);
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
    }, [addDocs, setSelectedId]);

    return { isDragOver };
}
