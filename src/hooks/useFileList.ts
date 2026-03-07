import { useCallback, useState } from 'react';
import type { SourceFile } from '../domain';
import { reorderById } from '../utils';

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
        setFiles((prev) => reorderById(prev, fromId, toId));
    }, []);

    return { files, addFiles, removeFile, updateFilePath, reorderFiles };
}
