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
        const unlisteners: Array<() => void> = [];

        void listen('tauri://drag-enter', () => setIsDragOver(true)).then((fn) =>
            unlisteners.push(fn),
        );
        void listen('tauri://drag-over', () => setIsDragOver(true)).then((fn) =>
            unlisteners.push(fn),
        );
        void listen('tauri://drag-leave', () => setIsDragOver(false)).then((fn) =>
            unlisteners.push(fn),
        );
        void listen<DragDropPayload>('tauri://drag-drop', (e) => {
            setIsDragOver(false);
            const paths = e.payload.paths;
            if (!paths?.length) return;
            void openDocsFromPaths(paths).then((docs) => {
                if (!docs.length) return;
                addDocs(docs);
                setSelectedId(docs[0].id);
            });
        }).then((fn) => unlisteners.push(fn));

        return () => unlisteners.forEach((fn) => fn());
    }, [addDocs, setSelectedId]);

    return { isDragOver };
}
