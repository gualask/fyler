import { useCallback, useState } from 'react';
import type { FileEdits } from '@/domain';

export function useFileEdits() {
    const [editsByFile, setEditsByFile] = useState<Record<string, FileEdits>>({});

    const setFileEdits = useCallback((fileId: string, edits: FileEdits) => {
        setEditsByFile((prev) => ({ ...prev, [fileId]: edits }));
    }, []);

    const clearFileEdits = useCallback((fileId: string) => {
        setEditsByFile((prev) => {
            if (!(fileId in prev)) return prev;
            const next = { ...prev };
            delete next[fileId];
            return next;
        });
    }, []);

    const clearAllFileEdits = useCallback(() => {
        setEditsByFile({});
    }, []);

    return {
        editsByFile,
        setFileEdits,
        clearFileEdits,
        clearAllFileEdits,
    };
}
