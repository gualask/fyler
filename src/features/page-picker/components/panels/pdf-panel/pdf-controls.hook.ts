import { useMemo, useState } from 'react';

import type { FinalPage, SourceFile, SourceTarget } from '@/shared/domain';

import { usePageSpecInput } from './page-spec-input.hook';

type PdfSelectionMode = 'all' | 'none' | 'custom';

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onSetPdfPages: (fileId: string, pages: number[]) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
    onFocusTarget: (fileId: string, target: SourceTarget) => void;
}

function selectedPdfPages(fileId: string, finalPages: FinalPage[]) {
    const pageNums = new Set<number>();
    for (const page of finalPages) {
        if (page.fileId === fileId && page.kind === 'pdf') {
            pageNums.add(page.pageNum);
        }
    }

    return {
        selectedPages: Array.from(pageNums).sort((a, b) => a - b),
        selectedPageNums: pageNums,
    };
}

function selectionMode(selectedCount: number, pageCount: number | null): PdfSelectionMode {
    if (selectedCount === 0) return 'none';
    if (pageCount !== null && pageCount > 0 && selectedCount === pageCount) return 'all';

    return 'custom';
}

function pageRange(fromPage: number, toPage: number): number[] {
    const lo = Math.min(fromPage, toPage);
    const hi = Math.max(fromPage, toPage);

    return Array.from({ length: hi - lo + 1 }, (_, index) => lo + index);
}

function pdfPagesWithSelection(selectedPageNums: Set<number>, pageNums: number[]): number[] {
    return [...Array.from(selectedPageNums), ...pageNums];
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

    const { selectedPages, selectedPageNums } = useMemo(
        () => selectedPdfPages(file.id, finalPages),
        [file.id, finalPages],
    );
    const selectedCount = selectedPageNums.size;
    const mode = selectionMode(selectedCount, file.pageCount);

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
        if (event.shiftKey && lastClickedPage !== null) {
            onSetPdfPages(
                file.id,
                pdfPagesWithSelection(selectedPageNums, pageRange(lastClickedPage, pageNum)),
            );
            setLastClickedPage(pageNum);
            return;
        }

        if (selectedPageNums.has(pageNum)) {
            onFocusTarget(file.id, { kind: 'pdf', pageNum });
            setLastClickedPage(pageNum);
            return;
        }

        onSetPdfPages(file.id, pdfPagesWithSelection(selectedPageNums, [pageNum]));
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
