import { useCallback, useState } from 'react';
import type { SourceFile } from '../domain';

/** Manages the raw files array: add, remove, reorder. */
export function useFileList() {
    const [files, setFiles] = useState<SourceFile[]>([]);

    const addFiles = useCallback((newFiles: SourceFile[]) => {
        setFiles((prev) => {
            const existingPaths = new Set(prev.map((f) => f.path));
            const unique = newFiles.filter((f) => !existingPaths.has(f.path));
            return unique.length ? [...prev, ...unique] : prev;
        });
    }, []);

    const removeFile = useCallback((id: string) => {
        setFiles((prev) => prev.filter((f) => f.id !== id));
    }, []);

    const updateFilePath = useCallback((id: string, path: string) => {
        setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, path } : f)));
    }, []);

    const reorderFiles = useCallback((fromId: string, toId: string) => {
        setFiles((prev) => {
            const fromIdx = prev.findIndex((f) => f.id === fromId);
            const toIdx = prev.findIndex((f) => f.id === toId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const next = [...prev];
            const [item] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, item);
            return next;
        });
    }, []);

    return { files, addFiles, removeFile, updateFilePath, reorderFiles };
}
