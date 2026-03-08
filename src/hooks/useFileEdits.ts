import { useCallback, useState } from 'react';
import type { FileEdits, SourceFile } from '../domain';
import { applyRotationToEdits, emptyFileEdits, type RotationDirection } from '../fileEdits';

export function useFileEdits() {
    const [editsByFile, setEditsByFile] = useState<Record<string, FileEdits>>({});

    const rotatePage = useCallback((file: SourceFile, pageNum: number, direction: RotationDirection): FileEdits => {
        let next = emptyFileEdits();
        setEditsByFile((prev) => {
            next = applyRotationToEdits(prev[file.id], file.kind, pageNum, direction);
            return { ...prev, [file.id]: next };
        });
        return next;
    }, []);

    const clearFileEdits = useCallback((fileId: string) => {
        setEditsByFile((prev) => {
            if (!(fileId in prev)) return prev;
            const next = { ...prev };
            delete next[fileId];
            return next;
        });
    }, []);

    return {
        editsByFile,
        rotatePage,
        clearFileEdits,
    };
}
