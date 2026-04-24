import { IconFileTypePdf, IconPhoto } from '@tabler/icons-react';
import { useMemo } from 'react';
import { buildThumbnailRenderRequest, useExportMatchedImage, useLazyPdfRender } from '@/infra/pdf';
import { getPreviewUrl } from '@/infra/platform';
import type { ImageFit } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import { useTranslation } from '@/shared/i18n';
import { PageQuickActions } from '@/shared/ui/actions/PageQuickActions';
import type { ListItem } from '../list-item.types';
import { FinalDocumentDragHandle } from './FinalDocumentRowShell';
import { RotatedThumbnailImage } from './RotatedThumbnailImage';

interface Props {
    item: ListItem;
    imageFit: ImageFit;
    scrollRoot: HTMLDivElement | null;
    onPreview: () => void;
    size?: 'sm' | 'lg';
    className?: string;
}

export function ListRowThumbnail({
    item,
    imageFit,
    scrollRoot,
    onPreview,
    size = 'sm',
    className,
}: Props) {
    const { t } = useTranslation();
    const detailLabel =
        item.page.kind === 'pdf'
            ? t('finalDocument.pdfPageLabel', { pageNum: item.page.pageNum })
            : t('finalDocument.imageLabel');
    const thumbRequest = useMemo(
        () =>
            item.page.kind === 'pdf'
                ? buildThumbnailRenderRequest(item.page.pageNum, item.edits)
                : null,
        [item.edits, item.page],
    );
    const { dataUrl: thumbUrl, setTargetEl } = useLazyPdfRender(
        item.page.kind === 'pdf' ? item.file : undefined,
        thumbRequest,
        scrollRoot,
    );
    const imageOriginalPath = item.file?.kind === 'image' ? item.file.originalPath : undefined;
    const imageUrl = imageOriginalPath ? getPreviewUrl(imageOriginalPath) : null;
    const imageQuarterTurns =
        item.file?.kind === 'image' ? FileEditsVO.getImageQuarterTurn(item.edits) : 0;
    const imageRotation =
        item.file?.kind === 'image' ? FileEditsVO.getImageRotationDegrees(item.edits) : 0;
    const { exportMatchedImageSrc } = useExportMatchedImage(
        imageUrl ?? undefined,
        imageOriginalPath,
        imageFit,
        imageQuarterTurns,
        item.file?.kind === 'image',
        size === 'lg' ? 360 : 120,
    );
    const imageThumbUrl = exportMatchedImageSrc ?? imageUrl;
    const imageThumbClassName = [
        'h-full w-full bg-white',
        exportMatchedImageSrc
            ? 'object-contain'
            : imageFit === 'cover'
              ? 'object-cover'
              : 'object-contain',
    ].join(' ');

    const containerClassName =
        size === 'lg'
            ? [
                  'thumb-card group relative mx-auto aspect-[3/4] w-full max-w-[352px] overflow-hidden rounded-lg border-2 bg-ui-surface-hover',
                  item.isSelected
                      ? 'border-[3px] border-ui-accent'
                      : 'border-ui-border hover:border-ui-accent/50',
                  className,
              ]
                  .filter(Boolean)
                  .join(' ')
            : ['group relative shrink-0 overflow-hidden rounded bg-ui-surface-hover', className]
                  .filter(Boolean)
                  .join(' ');

    return (
        <div
            ref={item.page.kind === 'pdf' ? setTargetEl : undefined}
            className={containerClassName}
            style={size === 'sm' ? { width: 60, height: 80 } : undefined}
        >
            {thumbUrl ? (
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : imageThumbUrl ? (
                <RotatedThumbnailImage
                    src={imageThumbUrl}
                    alt=""
                    className={imageThumbClassName}
                    imageRotation={exportMatchedImageSrc ? 0 : imageRotation}
                />
            ) : (
                <div className="flex h-full items-center justify-center">
                    {item.file?.kind === 'image' ? (
                        <IconPhoto className="h-5 w-5 text-ui-kind-image" />
                    ) : (
                        <IconFileTypePdf className="h-5 w-5 text-ui-kind-pdf" />
                    )}
                </div>
            )}
            <PageQuickActions compact={size === 'sm'} onPreview={onPreview} />

            {size === 'lg' ? (
                <div className="absolute inset-x-0 bottom-0 z-30 px-2 py-1.5 text-white">
                    <div className="absolute inset-0 bg-black/55" />
                    <div className="relative flex min-w-0 items-center gap-1.5">
                        <FinalDocumentDragHandle
                            className="shrink-0 flex h-7 w-7 items-center justify-center cursor-grab rounded-md text-white/90 hover:bg-white/10 active:cursor-grabbing"
                            iconClassName="h-5 w-5"
                        />

                        <div className="min-w-0">
                            <p className="truncate text-[11px] font-semibold">
                                {item.file?.name ?? '—'}
                            </p>
                            <p className="truncate text-[10px] font-medium opacity-90">
                                {detailLabel}
                            </p>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
