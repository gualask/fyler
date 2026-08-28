import { IconCheck } from '@tabler/icons-react';
import { useMemo } from 'react';
import type { SourceFile } from '@/capabilities/document-sources';
import { useLazyPdfRender } from '@/infrastructure/pdfjs';
import { buildThumbnailRenderRequest } from '@/modules/merge/application/pdf-render-profiles';
import type { FileEdits } from '@/modules/merge/model';
import type { RotationDirection } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { PageQuickActions } from '@/shared/ui/actions/PageQuickActions';
import { FocusFlashOverlay } from '@/shared/ui/feedback/FocusFlashOverlay';

interface Props {
    file: SourceFile;
    pageNum: number;
    edits: FileEdits;
    scrollRoot: HTMLDivElement | null;
    isSelected: boolean;
    isFocused: boolean;
    focusFlashKey?: number;
    onClick: (event: React.MouseEvent) => void;
    onToggleSelected: () => void;
    onPreview: () => void;
    onRotate: (direction: RotationDirection) => void;
}

function PdfThumbnailPreview({
    dataUrl,
    pageNum,
}: {
    dataUrl: string | null | undefined;
    pageNum: number;
}) {
    const { t } = useTranslation();
    if (dataUrl) {
        return (
            <img
                src={dataUrl}
                alt={t('pagePicker.pageLabel', { pageNum })}
                className="block h-full w-full object-cover"
            />
        );
    }

    return (
        <div className="flex h-full w-full items-center justify-center bg-ui-surface-hover">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-ui-accent-muted border-t-transparent motion-reduce:animate-none" />
        </div>
    );
}

function PdfSelectionToggle({
    isSelected,
    onToggleSelected,
}: Pick<Props, 'isSelected' | 'onToggleSelected'>) {
    const { t } = useTranslation();
    const label = t(isSelected ? 'pagePicker.removePage' : 'pagePicker.addPage');

    return (
        <button
            type="button"
            onClick={(event) => {
                event.stopPropagation();
                onToggleSelected();
            }}
            className={[
                'page-picker-thumb-toggle',
                isSelected
                    ? 'page-picker-thumb-toggle-selected'
                    : 'bg-white/90 text-slate-800 ring-1 ring-black/20 hover:bg-white',
            ].join(' ')}
            title={label}
            aria-label={label}
        >
            {isSelected ? <IconCheck className="h-3.5 w-3.5" aria-hidden="true" /> : null}
        </button>
    );
}

function PdfThumbnailLabel({ pageNum, isFocused }: Pick<Props, 'pageNum' | 'isFocused'>) {
    const { t } = useTranslation();
    return (
        <p
            className={[
                'page-picker-thumb-label mx-auto w-full max-w-[17rem] text-center text-[10px] uppercase tracking-[0.14em]',
                isFocused ? 'font-bold text-ui-accent-text' : 'font-semibold text-ui-text-muted',
            ].join(' ')}
        >
            {t('pagePicker.pageLabel', { pageNum })}
        </p>
    );
}

export function PdfThumbnailItem({
    file,
    pageNum,
    edits,
    scrollRoot,
    isSelected,
    isFocused,
    focusFlashKey,
    onClick,
    onToggleSelected,
    onPreview,
    onRotate,
}: Props) {
    const request = useMemo(() => buildThumbnailRenderRequest(pageNum, edits), [edits, pageNum]);
    const { dataUrl, setTargetEl } = useLazyPdfRender(file, request, scrollRoot);

    return (
        <div className="flex flex-col">
            <div
                ref={setTargetEl}
                data-page={pageNum}
                onClick={onClick}
                className={[
                    'thumb-card group relative mx-auto aspect-[3/4] w-full max-w-[17rem] cursor-pointer overflow-hidden rounded-xl border-2 transition-[background-color,border-color,box-shadow,transform] active:scale-[0.97] motion-reduce:transform-none motion-reduce:transition-none',
                    isFocused
                        ? 'thumb-card-focused border-[3px] border-ui-accent'
                        : 'border-transparent hover:border-ui-accent/50 thumb-card-idle',
                ].join(' ')}
            >
                <PdfThumbnailPreview dataUrl={dataUrl} pageNum={pageNum} />

                {isFocused && focusFlashKey ? (
                    <FocusFlashOverlay flashKey={focusFlashKey} className="inset-0" />
                ) : null}

                <PageQuickActions
                    onPreview={onPreview}
                    onRotateLeft={() => onRotate('ccw')}
                    onRotateRight={() => onRotate('cw')}
                />

                <PdfSelectionToggle isSelected={isSelected} onToggleSelected={onToggleSelected} />
            </div>
            <PdfThumbnailLabel pageNum={pageNum} isFocused={isFocused} />
        </div>
    );
}
