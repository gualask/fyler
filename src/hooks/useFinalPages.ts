import { useCallback, useState } from 'react';
import type { SourceFile, FinalPage } from '../domain';

export function useFinalPages() {
    const [finalPages, setFinalPages] = useState<FinalPage[]>([]);

    const addAllPagesForFile = useCallback((file: SourceFile) => {
        setFinalPages((prev) => {
            const filtered = prev.filter((fp) => fp.fileId !== file.id);
            const newPages: FinalPage[] =
                file.kind === 'image'
                    ? [{ id: crypto.randomUUID(), fileId: file.id, pageNum: 0 }]
                    : Array.from({ length: file.pageCount }, (_, i) => ({
                          id: crypto.randomUUID(),
                          fileId: file.id,
                          pageNum: i + 1,
                      }));
            return [...filtered, ...newPages];
        });
    }, []);

    const removePagesForFile = useCallback((fileId: string) => {
        setFinalPages((prev) => prev.filter((fp) => fp.fileId !== fileId));
    }, []);

    const togglePage = useCallback((fileId: string, pageNum: number) => {
        setFinalPages((prev) => {
            const exists = prev.some((fp) => fp.fileId === fileId && fp.pageNum === pageNum);
            if (exists) {
                return prev.filter((fp) => !(fp.fileId === fileId && fp.pageNum === pageNum));
            }
            return [...prev, { id: crypto.randomUUID(), fileId, pageNum }];
        });
    }, []);

    const togglePageRange = useCallback((fileId: string, from: number, to: number) => {
        const [lo, hi] = from <= to ? [from, to] : [to, from];
        setFinalPages((prev) => {
            const existingNums = new Set(
                prev.filter((fp) => fp.fileId === fileId).map((fp) => fp.pageNum),
            );
            const rangeNums = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
            const allPresent = rangeNums.every((n) => existingNums.has(n));
            if (allPresent) {
                return prev.filter(
                    (fp) => !(fp.fileId === fileId && fp.pageNum >= lo && fp.pageNum <= hi),
                );
            }
            const toAdd = rangeNums
                .filter((n) => !existingNums.has(n))
                .map((n) => ({ id: crypto.randomUUID(), fileId, pageNum: n }));
            return [...prev, ...toAdd];
        });
    }, []);

    const setFromPageSpec = useCallback((fileId: string, spec: string, total: number) => {
        setFinalPages((prev) => {
            const filtered = prev.filter((fp) => fp.fileId !== fileId);
            const pages = new Set<number>();
            if (!spec.trim()) {
                for (let p = 1; p <= total; p++) pages.add(p);
            } else {
                for (const token of spec.split(',')) {
                    const m = token.trim().match(/^(\d+)(?:-(\d+))?$/);
                    if (!m) continue;
                    const a = parseInt(m[1], 10);
                    const b = m[2] ? parseInt(m[2], 10) : a;
                    const lo = Math.min(a, b);
                    const hi = Math.min(Math.max(a, b), total);
                    for (let p = lo; p <= hi; p++) pages.add(p);
                }
            }
            const newPages = Array.from(pages)
                .sort((a, b) => a - b)
                .map((n) => ({ id: crypto.randomUUID(), fileId, pageNum: n }));
            return [...filtered, ...newPages];
        });
    }, []);

    const removeFinalPage = useCallback((id: string) => {
        setFinalPages((prev) => prev.filter((fp) => fp.id !== id));
    }, []);

    const reorderFinalPages = useCallback((fromId: string, toId: string) => {
        setFinalPages((prev) => {
            const fromIdx = prev.findIndex((fp) => fp.id === fromId);
            const toIdx = prev.findIndex((fp) => fp.id === toId);
            if (fromIdx === -1 || toIdx === -1) return prev;
            const next = [...prev];
            const [item] = next.splice(fromIdx, 1);
            next.splice(toIdx, 0, item);
            return next;
        });
    }, []);

    const selectAll = useCallback((file: SourceFile) => {
        setFinalPages((prev) => {
            const existingNums = new Set(
                prev.filter((fp) => fp.fileId === file.id).map((fp) => fp.pageNum),
            );
            if (file.kind === 'image') {
                if (existingNums.has(0)) return prev;
                return [...prev, { id: crypto.randomUUID(), fileId: file.id, pageNum: 0 }];
            }
            const toAdd: FinalPage[] = [];
            for (let p = 1; p <= file.pageCount; p++) {
                if (!existingNums.has(p)) {
                    toAdd.push({ id: crypto.randomUUID(), fileId: file.id, pageNum: p });
                }
            }
            return toAdd.length ? [...prev, ...toAdd] : prev;
        });
    }, []);

    const deselectAll = useCallback((fileId: string) => {
        setFinalPages((prev) => prev.filter((fp) => fp.fileId !== fileId));
    }, []);

    return {
        finalPages,
        addAllPagesForFile,
        removePagesForFile,
        togglePage,
        togglePageRange,
        setFromPageSpec,
        removeFinalPage,
        reorderFinalPages,
        selectAll,
        deselectAll,
    };
}
