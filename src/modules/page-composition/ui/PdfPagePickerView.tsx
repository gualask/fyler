import { IconCheck, IconX } from '@tabler/icons-react';
import { useMemo } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import { useLazyPdfRender } from '@/infrastructure/pdfjs';
import { useTranslation } from '@/shared/i18n';
import type { PdfPagePickerState, PickerStatus } from './pdf-page-picker.hook';

function PdfPagePreview({
    dataUrl,
    selected,
}: {
    dataUrl: string | null | undefined;
    selected: boolean;
}) {
    const { t } = useTranslation();
    return (
        <span className="relative block aspect-[3/4] w-full overflow-hidden rounded-lg bg-ui-surface shadow-sm">
            {dataUrl ? (
                <img src={dataUrl} alt="" className="h-full w-full object-contain" />
            ) : (
                <span
                    className="flex h-full items-center justify-center text-xs text-ui-text-muted"
                    role="status"
                >
                    {t('pageComposition.picker.loadingThumbnail')}
                </span>
            )}
            {selected ? (
                <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-ui-accent-solid text-ui-accent-on-solid shadow-md">
                    <IconCheck className="h-4 w-4" aria-hidden="true" />
                </span>
            ) : null}
        </span>
    );
}

function PdfPageOption({
    file,
    pageNum,
    selected,
    scrollRoot,
    onSelect,
}: {
    file: SourceFile;
    pageNum: number;
    selected: boolean;
    scrollRoot: HTMLDivElement | null;
    onSelect: () => void;
}) {
    const { t } = useTranslation();
    const request = useMemo(
        () => ({
            pageNum,
            quarterTurns: 0 as const,
            variant: 'thumb' as const,
            width: 220,
            quality: 0.82,
            density: Math.min(window.devicePixelRatio || 1, 2),
        }),
        [pageNum],
    );
    const { dataUrl, setTargetEl } = useLazyPdfRender(file, request, scrollRoot);
    return (
        <label
            ref={setTargetEl}
            className={`group relative flex cursor-pointer flex-col rounded-xl border-2 p-2 text-left transition-[border-color,background-color,transform] has-[:focus-visible]:outline-none has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ui-accent-muted active:scale-[0.98] motion-reduce:transform-none motion-reduce:transition-none ${
                selected
                    ? 'border-ui-accent bg-ui-accent-soft'
                    : 'border-transparent bg-ui-surface-hover hover:border-ui-border-hover'
            }`}
        >
            <input
                type="radio"
                name="composition-pdf-page"
                value={pageNum}
                checked={selected}
                onChange={onSelect}
                className="sr-only"
            />
            <PdfPagePreview dataUrl={dataUrl} selected={selected} />
            <span className="px-1 pb-0.5 pt-2 text-xs font-semibold text-ui-text-secondary">
                {t('pagePicker.pageLabel', { pageNum })}
            </span>
        </label>
    );
}

function PdfPagePickerHeader({
    titleId,
    fileName,
    confirming,
    onCancel,
}: {
    titleId: string;
    fileName: string;
    confirming: boolean;
    onCancel: () => void;
}) {
    const { t } = useTranslation();
    return (
        <header className="flex items-start justify-between gap-4 border-b border-ui-border px-5 py-4">
            <div className="min-w-0">
                <h2 id={titleId} className="text-lg font-semibold text-ui-text">
                    {t('pageComposition.picker.title')}
                </h2>
                <p className="mt-1 truncate text-sm text-ui-text-dim">{fileName}</p>
            </div>
            <button
                type="button"
                className="btn-icon"
                onClick={onCancel}
                disabled={confirming}
                aria-label={t('support.close')}
            >
                <IconX className="h-5 w-5" aria-hidden="true" />
            </button>
        </header>
    );
}

function PdfPageGrid({
    file,
    pages,
    selected,
    scrollRoot,
    onSelect,
}: {
    file: SourceFile;
    pages: number[];
    selected: number;
    scrollRoot: HTMLDivElement | null;
    onSelect: (pageNum: number) => void;
}) {
    return (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {pages.map((pageNum) => (
                <PdfPageOption
                    key={pageNum}
                    file={file}
                    pageNum={pageNum}
                    selected={selected === pageNum}
                    scrollRoot={scrollRoot}
                    onSelect={() => onSelect(pageNum)}
                />
            ))}
        </div>
    );
}

type ViewProps = {
    titleId: string;
    file: SourceFile;
    pages: number[];
    onCancel: () => void;
    picker: PdfPagePickerState;
};

function PdfPagePickerBody({ file, pages, picker }: Pick<ViewProps, 'file' | 'pages' | 'picker'>) {
    const { t } = useTranslation();
    return (
        <div
            ref={picker.setScrollRoot}
            role="radiogroup"
            aria-label={t('pageComposition.picker.pagesLabel')}
            className="min-h-0 flex-1 overflow-y-auto bg-ui-output p-5"
        >
            {picker.status === 'loading' ? (
                <p role="status" className="py-16 text-center text-sm text-ui-text-muted">
                    {t('pageComposition.picker.loading')}
                </p>
            ) : null}
            {picker.status === 'error' ? (
                <p role="alert" className="py-16 text-center text-sm text-ui-danger-soft-text">
                    {t('pageComposition.picker.loadError')}
                </p>
            ) : null}
            {pages.length > 0 ? (
                <PdfPageGrid
                    file={file}
                    pages={pages}
                    selected={picker.selected}
                    scrollRoot={picker.scrollRoot}
                    onSelect={picker.setSelected}
                />
            ) : null}
        </div>
    );
}

function PickerActions({
    status,
    pageCount,
    onCancel,
    onConfirm,
}: {
    status: PickerStatus;
    pageCount: number;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex gap-2">
            <button
                type="button"
                className="btn-ghost"
                onClick={onCancel}
                disabled={status === 'confirming'}
            >
                {t('pageComposition.cancel')}
            </button>
            <button
                type="button"
                className="btn-primary"
                onClick={onConfirm}
                disabled={status !== 'ready' || pageCount === 0}
            >
                {status === 'confirming'
                    ? t('pageComposition.picker.preparing')
                    : t('pageComposition.picker.confirm')}
            </button>
        </div>
    );
}

function PdfPagePickerFooter({ picker, onCancel }: Pick<ViewProps, 'picker' | 'onCancel'>) {
    const { t } = useTranslation();
    return (
        <footer className="flex items-center justify-between gap-4 border-t border-ui-border bg-ui-surface px-5 py-4">
            <p aria-live="polite" className="text-sm text-ui-text-dim">
                {picker.pageCount > 0
                    ? t('pageComposition.picker.selectedPage', { pageNum: picker.selected })
                    : ''}
            </p>
            <PickerActions
                status={picker.status}
                pageCount={picker.pageCount}
                onCancel={onCancel}
                onConfirm={() => void picker.confirm()}
            />
        </footer>
    );
}

export function PdfPagePickerView({ titleId, file, pages, onCancel, picker }: ViewProps) {
    return (
        <div className="dialog-backdrop dialog-backdrop-padded dialog-backdrop-strong">
            <div
                ref={picker.dialogRef}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                className="dialog-panel dialog-panel-bordered flex max-h-[88vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl outline-none"
            >
                <PdfPagePickerHeader
                    titleId={titleId}
                    fileName={file.name}
                    confirming={picker.status === 'confirming'}
                    onCancel={onCancel}
                />
                <PdfPagePickerBody file={file} pages={pages} picker={picker} />
                <PdfPagePickerFooter picker={picker} onCancel={onCancel} />
            </div>
        </div>
    );
}
