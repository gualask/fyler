import { useCallback, useEffect, useState } from 'react';
import { PageSpecVO } from '@/shared/domain/value-objects/page-spec.vo';

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
            setPageInput(PageSpecVO.formatAll(pageCount));
            return;
        }

        setPageInput(PageSpecVO.formatSelected(selectedPages));
    }, [isEditingInput, mode, pageCount, selectedPages]);

    const handlePageInputChange = (value: string) => {
        const nextDraft = normalizePageInput(value);
        setPageInput(nextDraft);

        const parsedPages = PageSpecVO.parseLoose(nextDraft, pageCount);
        onSetPages(fileId, parsedPages);
    };

    const commitPageInput = useCallback(() => {
        const parsedPages = PageSpecVO.parseLoose(pageInput, pageCount);
        onSetPages(fileId, parsedPages);

        const formatted = PageSpecVO.formatSelected(parsedPages);
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
