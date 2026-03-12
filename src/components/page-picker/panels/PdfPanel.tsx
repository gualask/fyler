import { useEffect, useState } from 'react';
import { CheckIcon } from '@heroicons/react/24/outline';

import type { FileEdits, FinalPage, SourceFile } from '../../../domain';
import type { RotationDirection } from '../../../fileEdits';
import { emptyFileEdits } from '../../../fileEdits';
import { usePdfControls } from '../hooks/usePdfControls';
import { usePdfCache } from '../../../hooks/usePdfCache';
import { buildThumbnailRenderRequest } from '../../../pdfRenderProfiles';
import { FocusFlashOverlay } from '../../shared/feedback/FocusFlashOverlay';
import { PageQuickActions } from '../../shared/actions/PageQuickActions';
import { PdfToolbar } from '../controls/PdfToolbar';

function scrollToPage(gridEl: HTMLDivElement | null, pageNum: number) {
    const el = gridEl?.querySelector(`[data-page="${pageNum}"]`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function PdfThumbnailItem({
    fileId,
    pageNum,
    edits,
    isSelected,
    isFocused,
    focusFlashKey,
    onClick,
    onPreview,
    onRotate,
}: {
    fileId: string;
    pageNum: number;
    edits: FileEdits;
    isSelected: boolean;
    isFocused: boolean;
    focusFlashKey?: number;
    onClick: (event: React.MouseEvent) => void;
    onPreview: () => void;
    onRotate: (direction: RotationDirection) => void;
}) {
    const { getRender } = usePdfCache();
    const dataUrl = getRender(fileId, buildThumbnailRenderRequest(pageNum, edits));

    return (
        <div className="flex flex-col">
            <div
                data-page={pageNum}
                onClick={onClick}
                className={[
                    'group relative aspect-[3/4] cursor-pointer overflow-hidden rounded-lg border-2 transition-all active:scale-95',
                    isFocused
                        ? 'border-[3px] border-ui-accent shadow-sm'
                        : 'border-transparent hover:border-ui-accent/50 hover:shadow-md',
                ].join(' ')}
            >
                {dataUrl ? (
                    <img
                        src={dataUrl}
                        alt={`p.${pageNum}`}
                        className="block h-full w-full bg-white object-contain"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-slate-100 dark:bg-zinc-800">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-ui-accent-muted border-t-transparent" />
                    </div>
                )}

                {isFocused && focusFlashKey && (
                    <FocusFlashOverlay flashKey={focusFlashKey} className="inset-0" />
                )}

                {isSelected && (
                    <div className="absolute right-1.5 top-1.5 z-20 flex h-5 w-5 items-center justify-center rounded-full bg-ui-accent shadow-md">
                        <CheckIcon className="h-3 w-3 text-white" />
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
                Pagina {pageNum}
            </p>
        </div>
    );
}

interface Props {
    file: SourceFile;
    finalPages: FinalPage[];
    onTogglePage: (fileId: string, pageNum: number) => void;
    onToggleRange: (fileId: string, from: number, to: number) => void;
    onSetFromSpec: (fileId: string, spec: string, total: number) => string | null;
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
    onSetFromSpec,
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
    } = usePdfControls({
        file,
        finalPages,
        onTogglePage,
        onToggleRange,
        onSetFromSpec,
        onSelectAll,
        onDeselectAll,
    });

    useEffect(() => {
        if (focusedPageNum === null) return;
        scrollToPage(gridEl, focusedPageNum);
    }, [focusedPageNum, focusFlashKey, gridEl]);

    const handleGoto = () => {
        const pageNum = getGotoTargetPage();
        if (pageNum === null) return;
        scrollToPage(gridEl, pageNum);
    };

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <PdfToolbar
                fileId={file.id}
                gotoInput={gotoInput}
                specInput={specInput}
                pageSpecError={pageSpecError}
                allSelected={allSelected}
                onGotoInputChange={setGotoInput}
                onSpecInputChange={handleSpecInputChange}
                onGotoSubmit={handleGoto}
                onSpecApply={handleSpecApply}
                onToggleAll={handleToggleAll}
            />

            <div ref={setGridEl} className="min-h-0 flex-1 overflow-y-auto p-4">
                <div className="grid grid-cols-2 gap-4">
                    {Array.from({ length: file.pageCount }, (_, index) => index + 1).map((pageNum) => (
                        <PdfThumbnailItem
                            key={`${pageNum}:${focusedPageNum === pageNum ? focusFlashKey ?? 0 : 0}`}
                            fileId={file.id}
                            pageNum={pageNum}
                            edits={editsByFile[file.id] ?? emptyFileEdits()}
                            isSelected={selectedPageNums.has(pageNum)}
                            isFocused={focusedPageNum === pageNum}
                            focusFlashKey={focusedPageNum === pageNum ? focusFlashKey : undefined}
                            onClick={(event) => handleThumbClick(pageNum, event)}
                            onPreview={() => onPreview(pageNum)}
                            onRotate={(direction) => void onRotatePage(file.id, pageNum, direction)}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}
