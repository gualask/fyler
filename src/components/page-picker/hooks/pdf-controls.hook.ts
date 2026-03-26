import { useMemo, useState } from 'react';

import type { FinalPage, SourceFile } from '@/domain';

import { usePageSpecInput } from './page-spec-input.hook';

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onToggleRange: (fileId: string, from: number, to: number) => void;
    onSetPages: (fileId: string, pages: number[]) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
}

export function usePdfControls({
    file,
    finalPages,
    onTogglePage,
    onToggleRange,
    onSetPages,
    onSelectAll,
    onDeselectAll,
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
        if (event.shiftKey && lastClickedPage !== null) {
            onToggleRange(file.id, lastClickedPage, pageNum);
        } else {
            onTogglePage(file.id, pageNum);
        }
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
