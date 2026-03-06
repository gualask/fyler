import { useCallback, useState } from 'react';
import type { Doc } from '../domain';

/** Manages the raw docs array: add, remove, mutate fields, reorder. */
export function useDocList() {
    const [docs, setDocs] = useState<Doc[]>([]);

    const addDocs = useCallback((newDocs: Doc[]) => {
        setDocs((prev) => {
            const existingPaths = new Set(prev.map((d) => d.path));
            const unique = newDocs.filter((d) => !existingPaths.has(d.path));
            return unique.length ? [...prev, ...unique] : prev;
        });
    }, []);

    const removeDoc = useCallback((id: string) => {
        setDocs((prev) => prev.filter((d) => d.id !== id));
    }, []);

    const updatePageSpec = useCallback((id: string, pageSpec: string) => {
        setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, pageSpec } : d)));
    }, []);

    const updateDocPath = useCallback((id: string, path: string) => {
        setDocs((prev) => prev.map((d) => (d.id === id ? { ...d, path } : d)));
    }, []);

    const reorderDocs = useCallback((fromId: string, toId: string) => {
        setDocs((prev) => {
            const fromIdx = prev.findIndex((d) => d.id === fromId);
            const toIdx = prev.findIndex((d) => d.id === toId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const next = [...prev];
            const [item] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, item);
            return next;
        });
    }, []);

    return { docs, addDocs, removeDoc, updatePageSpec, updateDocPath, reorderDocs };
}
