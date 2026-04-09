import { IconCheck } from '@tabler/icons-react';
import { useMemo } from 'react';
import { buildThumbnailRenderRequest, useLazyPdfRender } from '@/infra/pdf';
import type { FileEdits, RotationDirection, SourceFile } from '@/shared/domain';
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
                    'thumb-card group relative mx-auto aspect-[3/4] w-full max-w-[352px] cursor-pointer overflow-hidden rounded-lg border-2 transition-all active:scale-[0.97]',
                    isFocused
                        ? 'thumb-card-focused border-[3px] border-ui-accent'
                        : 'border-transparent hover:border-ui-accent/50 thumb-card-idle',
                ].join(' ')}
            >
                {dataUrl ? (
                    <img
                        src={dataUrl}
                        alt={t('pagePicker.pageLabel', { pageNum })}
                        className="block h-full w-full object-cover"
                    />
                ) : (
                    <div className="flex h-full w-full items-center justify-center bg-ui-surface-hover">
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-ui-accent-muted border-t-transparent" />
                    </div>
                )}

                {isFocused && focusFlashKey && (
                    <FocusFlashOverlay flashKey={focusFlashKey} className="inset-0" />
                )}

                <PageQuickActions
                    onPreview={onPreview}
                    onRotateLeft={() => onRotate('ccw')}
                    onRotateRight={() => onRotate('cw')}
                />

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onToggleSelected();
                    }}
                    className={[
                        'absolute right-1.5 top-1.5 z-30 flex h-6 w-6 items-center justify-center rounded-md shadow-md transition-colors',
                        isSelected
                            ? 'bg-ui-accent text-white'
                            : 'bg-white/90 text-slate-800 ring-1 ring-black/20 hover:bg-white',
                    ].join(' ')}
                    title={t(isSelected ? 'pagePicker.removePage' : 'pagePicker.addPage')}
                    aria-label={t(isSelected ? 'pagePicker.removePage' : 'pagePicker.addPage')}
                >
                    {isSelected ? <IconCheck className="h-3.5 w-3.5" /> : null}
                </button>
            </div>

            <p
                className={[
                    'mt-1 text-center text-[9px]',
                    isFocused ? 'font-bold text-ui-accent' : 'font-medium text-ui-text-muted',
                ].join(' ')}
            >
                {t('pagePicker.pageLabel', { pageNum })}
            </p>
        </div>
    );
}
