import { ArrowUturnLeftIcon, ArrowUturnRightIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import type { Doc } from '../domain';
import { PdfPreview } from './PdfPreview';

interface Props {
    selectedDoc: Doc | null;
    previewUrl: string | null;
    onStatus: (status: string) => void;
    onRotate?: (pageNum: number, angle: number) => void;
}

export function PreviewPanel({ selectedDoc, previewUrl, onStatus, onRotate }: Props) {
    const [pageNum, setPageNum] = useState(1);
    const [pageCount, setPageCount] = useState(0);

    useEffect(() => {
        setPageNum(1);
        setPageCount(0);
    }, [selectedDoc?.id]);

    const canPrev = pageNum > 1;
    const canNext = pageNum < pageCount;


    const showPdfControls = selectedDoc?.kind === 'pdf' && pageCount > 0;

    return (
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Toolbar — visibile solo se c'è un PDF selezionato */}
            {selectedDoc?.kind === 'pdf' && (
                <div className="mb-4 flex shrink-0 items-center justify-between">
                    {/* Navigazione pagine */}
                    <div className="flex items-center gap-1 rounded-lg bg-ui-bg p-1">
                        <button
                            disabled={!canPrev}
                            onClick={() => setPageNum((n) => n - 1)}
                            title="Pagina precedente"
                            className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronLeftIcon className="h-4 w-4" />
                        </button>
                        {showPdfControls && (
                            <span className="min-w-[3.5rem] text-center text-xs font-medium text-ui-text-secondary">
                                {pageNum} / {pageCount}
                            </span>
                        )}
                        <button
                            disabled={!canNext}
                            onClick={() => setPageNum((n) => n + 1)}
                            title="Pagina successiva"
                            className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text disabled:cursor-not-allowed disabled:opacity-30"
                        >
                            <ChevronRightIcon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Rotazione */}
                    {onRotate && (
                        <div className="flex items-center gap-1 rounded-lg bg-ui-bg p-1">
                            <button
                                onClick={() => onRotate(pageNum, -90)}
                                title="Ruota 90° antiorario"
                                className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface-hover"
                            >
                                <ArrowUturnLeftIcon className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => onRotate(pageNum, 90)}
                                title="Ruota 90° orario"
                                className="rounded-lg p-1.5 text-ui-text-muted transition-colors hover:bg-ui-surface-hover"
                            >
                                <ArrowUturnRightIcon className="h-4 w-4" />
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Card preview */}
            <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl border-2 border-ui-border bg-ui-surface shadow-xl dark:shadow-black/40">
                {!selectedDoc ? (
                    <div className="flex h-full items-center justify-center">
                        <p className="text-sm text-ui-text-muted">Seleziona un documento per visualizzare l&apos;anteprima.</p>
                    </div>
                ) : selectedDoc.kind === 'image' ? (
                    <div className="flex h-full items-center justify-center p-4">
                        <img
                            src={previewUrl!}
                            alt={selectedDoc.name}
                            className="h-full w-full rounded-lg object-contain"
                        />
                    </div>
                ) : (
                    <PdfPreview
                        key={selectedDoc.id}
                        url={previewUrl!}
                        pageNum={pageNum}
                        onPageCountChange={setPageCount}
                        onStatus={onStatus}
                        onNextPage={canNext ? () => setPageNum((n) => n + 1) : undefined}
                        onPrevPage={canPrev ? () => setPageNum((n) => n - 1) : undefined}
                    />
                )}
            </div>
        </div>
    );
}
