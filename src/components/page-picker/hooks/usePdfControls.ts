import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import type { FinalPage, SourceFile } from '../../../domain';
import { parseSelectedPagesFromSpec } from '../../../pageSpec';

const PAGE_INPUT_DEBOUNCE_MS = 600;

function normalizePageInput(value: string): string {
    return value.replace(/\s+/g, '');
}

function isIncompletePageInput(value: string): boolean {
    return /[-,]$/.test(value);
}

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
    const [pageInput, setPageInput] = useState('');
    const [pageInputError, setPageInputError] = useState('');
    const [lastClickedPage, setLastClickedPage] = useState<number | null>(null);
    const [appliedPageNum, setAppliedPageNum] = useState<number | null>(null);
    const [appliedPageSignal, setAppliedPageSignal] = useState(0);
    const lastAppliedSpecRef = useRef<string | null>(null);

    const selectedPageNums = useMemo(
        () => new Set(finalPages.filter((page) => page.fileId === file.id).map((page) => page.pageNum)),
        [file.id, finalPages],
    );
    const allSelected = file.pageCount > 0 && selectedPageNums.size === file.pageCount;

    const handleThumbClick = (pageNum: number, event: React.MouseEvent) => {
        if (event.shiftKey && lastClickedPage !== null) {
            onToggleRange(file.id, lastClickedPage, pageNum);
        } else {
            onTogglePage(file.id, pageNum);
        }
        setLastClickedPage(pageNum);
    };

    const applyPageInput = useCallback((force = false) => {
        const normalizedValue = normalizePageInput(pageInput);
        if (!normalizedValue) {
            setPageInputError('');
            return null;
        }

        if (isIncompletePageInput(normalizedValue)) {
            setPageInputError('');
            return null;
        }

        const parsed = parseSelectedPagesFromSpec(normalizedValue, file.pageCount);
        if (parsed.pages === null) {
            setPageInputError(parsed.error);
            return null;
        }

        if (!force && lastAppliedSpecRef.current === normalizedValue) {
            setPageInputError('');
            setAppliedPageNum(parsed.pages[0]);
            setAppliedPageSignal((signal) => signal + 1);
            return parsed.pages[0];
        }

        onSetPages(file.id, parsed.pages);
        setPageInputError('');
        lastAppliedSpecRef.current = normalizedValue;
        setPageInput(normalizedValue);
        setAppliedPageNum(parsed.pages[0]);
        setAppliedPageSignal((signal) => signal + 1);
        return parsed.pages[0];
    }, [file.id, file.pageCount, onSetPages, pageInput]);

    useEffect(() => {
        const normalizedValue = normalizePageInput(pageInput);
        if (!normalizedValue || isIncompletePageInput(normalizedValue) || lastAppliedSpecRef.current === normalizedValue) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            applyPageInput();
        }, PAGE_INPUT_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [applyPageInput, pageInput]);

    const handleToggleAll = () => {
        if (allSelected) {
            onDeselectAll(file.id);
        } else {
            onSelectAll(file);
        }
    };

    const handlePageInputChange = (value: string) => {
        setPageInput(value.replace(/[^\d,\-\s]/g, ''));
        if (lastAppliedSpecRef.current !== normalizePageInput(value)) {
            lastAppliedSpecRef.current = null;
        }
        if (pageInputError) {
            setPageInputError('');
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
