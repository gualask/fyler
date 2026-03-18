import { useCallback, useState } from 'react';
import type { SourceFile } from '../domain';
import { reorderById } from '../utils';

/** Manages the raw files array: add, remove, reorder. */
export function useFileList() {
    const [files, setFiles] = useState<SourceFile[]>([]);

    const addFiles = useCallback((newFiles: SourceFile[]) => {
        setFiles((prev) => newFiles.length ? [...prev, ...newFiles] : prev);
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
