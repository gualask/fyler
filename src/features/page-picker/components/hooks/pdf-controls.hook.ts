import { useMemo, useState } from 'react';

import type { FinalPage, SourceFile } from '@/shared/domain';

import { usePageSpecInput } from './page-spec-input.hook';

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onSetPages: (fileId: string, pages: number[]) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
    onFocusPage: (fileId: string, pageNum: number) => void;
}

export function usePdfControls({
    file,
    finalPages,
    onSetPages,
    onSelectAll,
    onDeselectAll,
    onFocusPage,
}: Props) {
    const [lastClickedPage, setLastClickedPage] = useState<number | null>(null);

    const { selectedPages, selectedPageNums } = useMemo(() => {
        const pageNums = new Set<number>();
        for (const page of finalPages) {
            if (page.fileId === file.id) {
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
        if (file.pageCount > 0 && selectedCount === file.pageCount) return 'all';
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
        pageCount: file.pageCount,
        selectedPages,
        mode,
        onSetPages,
    });

    const handleThumbClick = (pageNum: number, event: React.MouseEvent) => {
        const isSelected = selectedPageNums.has(pageNum);

        if (event.shiftKey && lastClickedPage !== null) {
            const [lo, hi] =
                lastClickedPage <= pageNum
                    ? [lastClickedPage, pageNum]
                    : [pageNum, lastClickedPage];
            const rangeNums = Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);
            onSetPages(file.id, [...Array.from(selectedPageNums), ...rangeNums]);
            setLastClickedPage(pageNum);
            return;
        }

        if (isSelected) {
            onFocusPage(file.id, pageNum);
            setLastClickedPage(pageNum);
            return;
        }

        onSetPages(file.id, [...Array.from(selectedPageNums), pageNum]);
        setLastClickedPage(pageNum);
    };

    const handleSelectAll = () => {
        onSelectAll(file);
    };

    const handleClearSelection = () => {
        onDeselectAll(file.id);
    };

    const handleEnableManual = () => {
        if (file.pageCount <= 0) return;
        onSetPages(file.id, [1]);
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
