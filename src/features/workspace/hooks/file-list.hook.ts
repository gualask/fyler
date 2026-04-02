import { useCallback, useState } from 'react';
import type { SourceFile } from '@/shared/domain';

function reorderById<T extends { id: string }>(arr: T[], fromId: string, toId: string): T[] {
    const fromIdx = arr.findIndex((x) => x.id === fromId);
    const toIdx = arr.findIndex((x) => x.id === toId);
    if (fromIdx === -1 || toIdx === -1) return arr;
    const next = [...arr];
    const [item] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, item);
    return next;
}

/** Manages the raw files array: add, remove, reorder. */
export function useFileList() {
    const [files, setFiles] = useState<SourceFile[]>([]);

    const addFiles = useCallback((newFiles: SourceFile[]) => {
        setFiles((prev) => (newFiles.length ? [...prev, ...newFiles] : prev));
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const clearFiles = useCallback(() => {
        setFiles([]);
    }, []);

    const reorderFiles = useCallback((fromId: string, toId: string) => {
        setFiles((prev) => reorderById(prev, fromId, toId));
    }, []);

    return { files, addFiles, removeFile, clearFiles, reorderFiles };
}
