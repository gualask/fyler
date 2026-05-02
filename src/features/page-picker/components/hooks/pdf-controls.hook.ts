import { useMemo, useState } from 'react';

import type { FinalPage, SourceFile, SourceTarget } from '@/shared/domain';

import { usePageSpecInput } from './page-spec-input.hook';

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onSetPdfPages: (fileId: string, pages: number[]) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
    onFocusTarget: (fileId: string, target: SourceTarget) => void;
}

export function usePdfControls({
    file,
    finalPages,
    onSetPdfPages,
    onSelectAll,
    onDeselectAll,
    onFocusTarget,
}: Props) {
    const [lastClickedPage, setLastClickedPage] = useState<number | null>(null);

    const { selectedPages, selectedPageNums } = useMemo(() => {
        const pageNums = new Set<number>();
        for (const page of finalPages) {
            if (page.fileId === file.id && page.kind === 'pdf') {
                pageNums.add(page.pageNum);
            }
        }

        return {
            selectedPages: Array.from(pageNums).sort((a, b) => a - b),
            selectedPageNums: pageNums,
        };
    }, [file.id, finalPages]);
    const selectedCount = selectedPageNums.size;
    const mode: 'all' | 'none' | 'custom' = (() => {
        if (selectedCount === 0) return 'none';
        if (file.pageCount !== null && file.pageCount > 0 && selectedCount === file.pageCount)
            return 'all';
        return 'custom';
    })();

    const {
        pageInput,
        appliedPageNum,
        appliedPageSignal,
        commitPageInput,
        handleFocus,
        handleBlur,
        handlePageInputChange,
    } = usePageSpecInput({
        fileId: file.id,
        pageCount: file.pageCount ?? 0,
        selectedPages,
        mode,
        onSetPdfPages,
    });

    const handleThumbClick = (pageNum: number, event: React.MouseEvent) => {
        const isSelected = selectedPageNums.has(pageNum);

        if (event.shiftKey && lastClickedPage !== null) {
            const [lo, hi] =
                lastClickedPage <= pageNum
                    ? [lastClickedPage, pageNum]
                    : [pageNum, lastClickedPage];
            const rangeNums = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
            onSetPdfPages(file.id, [...Array.from(selectedPageNums), ...rangeNums]);
            setLastClickedPage(pageNum);
            return;
        }

        if (isSelected) {
            onFocusTarget(file.id, { kind: 'pdf', pageNum });
            setLastClickedPage(pageNum);
            return;
        }

        onSetPdfPages(file.id, [...Array.from(selectedPageNums), pageNum]);
        setLastClickedPage(pageNum);
    };

    const handleSelectAll = () => {
        onSelectAll(file);
    };

    const handleClearSelection = () => {
        onDeselectAll(file.id);
    };

    const handleEnableManual = () => {
        if (!file.pageCount) return;
        onSetPdfPages(file.id, [1]);
    };

    return {
        pageInput,
        mode,
        selectedPageNums,
        selectedCount,
        enableManual: handleEnableManual,
        handleThumbClick,
        commitPageInput,
        appliedPageNum,
        appliedPageSignal,
        handleSelectAll,
        handleClearSelection,
        handlePageInputChange,
        handleInputFocus: handleFocus,
        handleInputBlur: handleBlur,
    };
}
