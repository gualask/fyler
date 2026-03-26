import { IconCheck } from '@tabler/icons-react';
import { useEffect, useMemo, useState } from 'react';

import type { FileEdits, FinalPage, SourceFile } from '@/domain';
import type { RotationDirection } from '@/domain/file-edits';
import { emptyFileEdits } from '@/domain/file-edits';
import { useTranslation } from '@/i18n';
import { buildThumbnailRenderRequest, useLazyPdfRender } from '@/pdf';
import { PageQuickActions } from '../../shared/actions/PageQuickActions';
import { FocusFlashOverlay } from '../../shared/feedback/FocusFlashOverlay';
import { PdfToolbar } from '../controls/PdfToolbar';
import { usePdfControls } from '../hooks/pdf-controls.hook';

function scrollToPage(gridEl: HTMLDivElement | null, pageNum: number) {
    const el = gridEl?.querySelector(`[data-page="${pageNum}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function PdfThumbnailItem({
    file,
    pageNum,
    edits,
    scrollRoot,
    isSelected,
    isFocused,
    focusFlashKey,
    onClick,
    onPreview,
    onRotate,
}: {
    file: SourceFile;
    pageNum: number;
    edits: FileEdits;
    scrollRoot: HTMLDivElement | null;
    isSelected: boolean;
    isFocused: boolean;
    focusFlashKey?: number;
    onClick: (event: React.MouseEvent) => void;
    onPreview: () => void;
    onRotate: (direction: RotationDirection) => void;
}) {
    const { t } = useTranslation();
    const request = useMemo(() => buildThumbnailRenderRequest(pageNum, edits), [edits, pageNum]);
    const { dataUrl, setTargetEl } = useLazyPdfRender(file, request, scrollRoot);

    return (
        <div className="flex flex-col">
            <div
                ref={setTargetEl}
                data-page={pageNum}
                onClick={onClick}
                className={[
                    'thumb-card group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border-2 transition-all active:scale-[0.97]',
                    isFocused
                        ? 'thumb-card-focused border-[3px] border-ui-accent'
                        : 'border-transparent hover:border-ui-accent/50 thumb-card-idle',
                ].join(' ')}
            >
                {dataUrl ? (
                    <img
                        src={dataUrl}
                        alt={t('pagePicker.pageLabel', { pageNum })}
                        className="block h-full w-full bg-white object-contain"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-ui-surface-hover">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-ui-accent-muted border-t-transparent" />
                    </div>
                )}

                {isFocused && focusFlashKey && (
                    <FocusFlashOverlay flashKey={focusFlashKey} className="inset-0" />
                )}

                {isSelected && (
                    <div className="absolute right-1.5 top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-ui-accent shadow-md">
                        <IconCheck className="h-3 w-3 text-white" />
                    </div>
                )}

                <PageQuickActions
                    onPreview={onPreview}
                    onRotateLeft={() => onRotate('ccw')}
                    onRotateRight={() => onRotate('cw')}
                />
            </div>

            <p
                className={[
                    'mt-1.5 text-center text-[10px]',
                    isFocused ? 'font-bold text-ui-accent' : 'font-medium text-ui-text-muted',
                ].join(' ')}
            >
                {t('pagePicker.pageLabel', { pageNum })}
            </p>
        </div>
    );
}

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onToggleRange: (fileId: string, from: number, to: number) => void;
    onSetPages: (fileId: string, pages: number[]) => void;
    onSelectAll: (file: SourceFile) => void;
    onDeselectAll: (fileId: string) => void;
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
    onToggleRange,
    onSetPages,
    onSelectAll,
    onDeselectAll,
    onRotatePage,
    editsByFile,
    focusedPageNum,
    focusFlashKey,
    onPreview,
}: Props) {
    const [gridEl, setGridEl] = useState<HTMLDivElement | null>(null);
    const {
        pageInput,
        pageInputError,
        selectedPageNums,
        allSelected,
        handleThumbClick,
        applyPageInput,
        appliedPageNum,
        handleToggleAll,
        handlePageInputChange,
    } = usePdfControls({
        file,
        finalPages,
        onTogglePage,
        onToggleRange,
        onSetPages,
        onSelectAll,
        onDeselectAll,
    });

    useEffect(() => {
        if (focusedPageNum === null) return;
        scrollToPage(gridEl, focusedPageNum);
    }, [focusedPageNum, gridEl]);

    useEffect(() => {
        if (appliedPageNum === null) return;
        scrollToPage(gridEl, appliedPageNum);
    }, [appliedPageNum, gridEl]);

    const handlePageInputCommit = () => {
        applyPageInput(true);
    };

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <PdfToolbar
                fileId={file.id}
                pageInput={pageInput}
                pageInputError={pageInputError}
                allSelected={allSelected}
                onPageInputChange={handlePageInputChange}
                onPageInputCommit={handlePageInputCommit}
                onToggleAll={handleToggleAll}
            />

            <div ref={setGridEl} className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-4">
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
