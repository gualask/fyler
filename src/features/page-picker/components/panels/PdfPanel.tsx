import { useEffect, useState } from 'react';
import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import type { RotationDirection } from '@/shared/domain/file-edits';
import { emptyFileEdits } from '@/shared/domain/file-edits';
import { scrollIntoViewByDataAttr } from '@/shared/ui/scroll/scroll-into-view';
import { PdfToolbar } from '../controls/PdfToolbar';
import { usePdfControls } from '../hooks/pdf-controls.hook';
import { PdfThumbnailItem } from './PdfThumbnailItem';

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onSetPages: (fileId: string, pages: number[]) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
    onFocusPage: (fileId: string, pageNum: number) => void;
    onRotatePage: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    editsByFile: Record<string, FileEdits>;
    focusedPageNum: number | null;
    focusFlashKey?: number;
    onPreview: (pageNum: number) => void;
}

export function PdfPanel({
    file,
    finalPages,
    onTogglePage,
    onSetPages,
    onSelectAll,
    onDeselectAll,
    onFocusPage,
    onRotatePage,
    editsByFile,
    focusedPageNum,
    focusFlashKey,
    onPreview,
}: Props) {
    const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
    const {
        pageInput,
        mode,
        selectedPageNums,
        enableManual,
        handleThumbClick,
        commitPageInput,
        appliedPageNum,
        appliedPageSignal,
        handleSelectAll,
        handleClearSelection,
        handlePageInputChange,
        handleInputFocus,
        handleInputBlur,
    } = usePdfControls({
        file,
        finalPages,
        onSetPages,
        onSelectAll,
        onDeselectAll,
        onFocusPage,
    });

    useEffect(() => {
        if (focusedPageNum === null || !gridEl) return;
        return scrollIntoViewByDataAttr({
            root: gridEl,
            attr: 'data-page',
            value: String(focusedPageNum),
            signal: focusFlashKey,
        });
    }, [focusedPageNum, focusFlashKey, gridEl]);

    useEffect(() => {
        if (appliedPageNum === null || !gridEl) return;
        return scrollIntoViewByDataAttr({
            root: gridEl,
            attr: 'data-page',
            value: String(appliedPageNum),
            signal: appliedPageSignal,
        });
    }, [appliedPageNum, appliedPageSignal, gridEl]);

    const handlePageInputCommit = () => {
        commitPageInput();
    };

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <PdfToolbar
                fileId={file.id}
                pageCount={file.pageCount}
                pageInput={pageInput}
                onPageInputChange={handlePageInputChange}
                onPageInputCommit={handlePageInputCommit}
                onPageInputFocus={handleInputFocus}
                onPageInputBlur={handleInputBlur}
                onSelectAll={handleSelectAll}
                onClearSelection={handleClearSelection}
                onEnableManual={enableManual}
                mode={mode}
            />

            <div ref={setGridEl} className="section-body min-h-0 flex-1 overflow-y-auto p-3">
                <div className="page-picker-grid">
                    {Array.from({ length: file.pageCount }, (_, index) => index + 1).map(
                        (pageNum) => (
                            <PdfThumbnailItem
                                key={`${pageNum}:${focusedPageNum === pageNum ? (focusFlashKey ?? 0) : 0}`}
                                file={file}
                                pageNum={pageNum}
                                edits={editsByFile[file.id] ?? emptyFileEdits()}
                                scrollRoot={gridEl}
                                isSelected={selectedPageNums.has(pageNum)}
                                isFocused={focusedPageNum === pageNum}
                                focusFlashKey={
                                    focusedPageNum === pageNum ? focusFlashKey : undefined
                                }
                                onClick={(event) => handleThumbClick(pageNum, event)}
                                onToggleSelected={() => onTogglePage(file.id, pageNum)}
                                onPreview={() => onPreview(pageNum)}
                                onRotate={(direction) =>
                                    void onRotatePage(file.id, pageNum, direction)
                                }
                            />
                        ),
                    )}
                </div>
            </div>
        </div>
    );
}
