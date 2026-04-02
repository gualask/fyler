import { IconCheck } from '@tabler/icons-react';
import { useMemo } from 'react';
import { buildThumbnailRenderRequest, useLazyPdfRender } from '@/infra/pdf';
import type { FileEdits, SourceFile } from '@/shared/domain';
import type { RotationDirection } from '@/shared/domain/file-edits';
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
