import { useCallback, useEffect, useRef, useState } from 'react';
import { parseSelectedPagesFromSpec } from '@/domain/page-spec';
import { formatPageSpecError, useTranslation } from '@/i18n';

const PAGE_INPUT_DEBOUNCE_MS = 600;

function normalizePageInput(value: string): string {
    return value.replace(/\s+/g, '');
}

function isIncompletePageInput(value: string): boolean {
    return /[-,]$/.test(value);
}

interface PageSpecInputOptions {
    fileId: string;
    pageCount: number;
    onSetPages: (fileId: string, pages: number[]) => void;
}

export function usePageSpecInput({ fileId, pageCount, onSetPages }: PageSpecInputOptions) {
    const { t } = useTranslation();
    const [pageInput, setPageInput] = useState('');
    const [pageInputError, setPageInputError] = useState('');
    const [appliedPageNum, setAppliedPageNum] = useState<number | null>(null);
    const [appliedPageSignal, setAppliedPageSignal] = useState(0);
    const lastAppliedSpecRef = useRef<string | null>(null);

    const applyPageInput = useCallback(
        (force = false) => {
            const normalizedValue = normalizePageInput(pageInput);
            if (!normalizedValue) {
                setPageInputError('');
                return null;
            }

            if (isIncompletePageInput(normalizedValue)) {
                setPageInputError('');
                return null;
            }

            const parsed = parseSelectedPagesFromSpec(normalizedValue, pageCount);
            if (parsed.pages === null) {
                setPageInputError(formatPageSpecError(parsed.error, t));
                return null;
            }

            if (!force && lastAppliedSpecRef.current === normalizedValue) {
                setPageInputError('');
                setAppliedPageNum(parsed.pages[0]);
                setAppliedPageSignal((signal) => signal + 1);
                return parsed.pages[0];
            }

            onSetPages(fileId, parsed.pages);
            setPageInputError('');
            lastAppliedSpecRef.current = normalizedValue;
            setPageInput(normalizedValue);
            setAppliedPageNum(parsed.pages[0]);
            setAppliedPageSignal((signal) => signal + 1);
            return parsed.pages[0];
        },
        [fileId, pageCount, onSetPages, pageInput, t],
    );

    useEffect(() => {
        const normalizedValue = normalizePageInput(pageInput);
        if (
            !normalizedValue ||
            isIncompletePageInput(normalizedValue) ||
            lastAppliedSpecRef.current === normalizedValue
        ) {
            return;
        }

        const timeoutId = window.setTimeout(() => {
            applyPageInput();
        }, PAGE_INPUT_DEBOUNCE_MS);

        return () => window.clearTimeout(timeoutId);
    }, [applyPageInput, pageInput]);

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
        appliedPageNum,
        appliedPageSignal,
        applyPageInput,
        handlePageInputChange,
    };
}
