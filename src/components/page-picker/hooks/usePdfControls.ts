import { useMemo, useState } from 'react';

import type { FinalPage, SourceFile } from '../../../domain';

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onToggleRange: (fileId: string, from: number, to: number) => void;
    onSetFromSpec: (fileId: string, spec: string, total: number) => string | null;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
}

export function usePdfControls({
    file,
    finalPages,
    onTogglePage,
    onToggleRange,
    onSetFromSpec,
    onSelectAll,
    onDeselectAll,
}: Props) {
    const [specInput, setSpecInput] = useState('');
    const [gotoInput, setGotoInput] = useState('');
    const [pageSpecError, setPageSpecError] = useState('');
    const [lastClickedPage, setLastClickedPage] = useState<number | null>(null);

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

    const getGotoTargetPage = () => {
        const pageNum = Number.parseInt(gotoInput, 10);
        if (!pageNum || pageNum < 1 || pageNum > file.pageCount) {
            return null;
        }
        return pageNum;
    };

    const handleSpecApply = () => {
        const error = onSetFromSpec(file.id, specInput, file.pageCount);
        setPageSpecError(error ?? '');
    };

    const handleToggleAll = () => {
        if (allSelected) {
            onDeselectAll(file.id);
        } else {
            onSelectAll(file);
        }
    };

    const handleSpecInputChange = (value: string) => {
        setSpecInput(value);
        if (pageSpecError) {
            setPageSpecError('');
        }
    };

    return {
        specInput,
        gotoInput,
        pageSpecError,
        selectedPageNums,
        allSelected,
        setGotoInput,
        handleThumbClick,
        getGotoTargetPage,
        handleSpecApply,
        handleToggleAll,
        handleSpecInputChange,
    };
}
