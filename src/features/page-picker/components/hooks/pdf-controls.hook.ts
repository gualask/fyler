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

    const selectedPageNums = useMemo(
        () =>
            new Set(
                finalPages.filter((page) => page.fileId === file.id).map((page) => page.pageNum),
            ),
        [file.id, finalPages],
    );
    const allSelected = file.pageCount > 0 && selectedPageNums.size === file.pageCount;

    const {
        pageInput,
        pageInputError,
        appliedPageNum,
        appliedPageSignal,
        applyPageInput,
        handlePageInputChange,
    } = usePageSpecInput({
        fileId: file.id,
        pageCount: file.pageCount,
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

    const handleToggleAll = () => {
        if (allSelected) {
            onDeselectAll(file.id);
        } else {
            onSelectAll(file);
        }
    };

    return {
        pageInput,
        pageInputError,
        selectedPageNums,
        allSelected,
        handleThumbClick,
        applyPageInput,
        appliedPageNum,
        appliedPageSignal,
        handleToggleAll,
        handlePageInputChange,
    };
}
