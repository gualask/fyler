import { useCallback, useState } from 'react';
import type { SourceFile } from '../domain';
import { reorderById } from '../utils';

/** Manages the raw files array: add, remove, reorder. */
export function useFileList() {
    const [files, setFiles] = useState<SourceFile[]>([]);

    const addFiles = useCallback((newFiles: SourceFile[]) => {
        setFiles((prev) => {
            const existingPaths = new Set(prev.map((f) => f.originalPath));
            const unique = newFiles.filter((f) => {
                if (existingPaths.has(f.originalPath)) return false;
                existingPaths.add(f.originalPath);
                return true;
            });
            return unique.length ? [...prev, ...unique] : prev;
        });
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
