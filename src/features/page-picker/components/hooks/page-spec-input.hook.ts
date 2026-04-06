import { useCallback, useEffect, useState } from 'react';
import {
    formatAllPagesToSpec,
    formatSelectedPagesToSpec,
    parseSelectedPagesFromSpecLoose,
} from '@/shared/domain/page-spec';

function normalizePageInput(value: string): string {
    return value.replace(/[^\d,\-\s]/g, '');
}

interface PageSpecInputOptions {
    fileId: string;
    pageCount: number;
    selectedPages: number[];
    mode: 'all' | 'none' | 'custom';
    onSetPages: (fileId: string, pages: number[]) => void;
}

export function usePageSpecInput({
    fileId,
    pageCount,
    selectedPages,
    mode,
    onSetPages,
}: PageSpecInputOptions) {
    const [pageInput, setPageInput] = useState('');
    const [appliedPageNum, setAppliedPageNum] = useState<number | null>(null);
    const [appliedPageSignal, setAppliedPageSignal] = useState(0);
    const [isEditingInput, setIsEditingInput] = useState(false);

    useEffect(() => {
        if (isEditingInput) return;

        if (mode === 'none') {
            setPageInput('');
            return;
        }

        if (mode === 'all') {
            setPageInput(formatAllPagesToSpec(pageCount));
            return;
        }

        setPageInput(formatSelectedPagesToSpec(selectedPages));
    }, [isEditingInput, mode, pageCount, selectedPages]);

    const handlePageInputChange = (value: string) => {
        const nextDraft = normalizePageInput(value);
        setPageInput(nextDraft);

        const parsedPages = parseSelectedPagesFromSpecLoose(nextDraft, pageCount);
        onSetPages(fileId, parsedPages);
    };

    const commitPageInput = useCallback(() => {
        const parsedPages = parseSelectedPagesFromSpecLoose(pageInput, pageCount);
        onSetPages(fileId, parsedPages);

        const formatted = formatSelectedPagesToSpec(parsedPages);
        setPageInput(formatted);
        setAppliedPageNum(parsedPages[0] ?? null);
        setAppliedPageSignal((signal) => signal + 1);
        return parsedPages[0] ?? null;
    }, [fileId, onSetPages, pageCount, pageInput]);

    return {
        pageInput,
        appliedPageNum,
        appliedPageSignal,
        commitPageInput,
        handleFocus: () => {
            setIsEditingInput(true);
        },
        handleBlur: () => {
            setIsEditingInput(false);
        },
        handlePageInputChange,
    };
}
