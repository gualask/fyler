import { IconFileTypePdf, IconPhoto } from '@tabler/icons-react';
import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { buildThumbnailRenderRequest, useExportMatchedImage, useLazyPdfRender } from '@/infra/pdf';
import { getPreviewUrl } from '@/infra/platform';
import type { ImageFit, QuarterTurn } from '@/shared/domain';
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

type ThumbnailSize = NonNullable<Props['size']>;

interface ImageThumbState {
    url: string | null;
    className: string;
    rotation: number;
}

function isImageItem(item: ListItem): boolean {
    return item.file?.kind === 'image';
}

function imageOriginalPath(item: ListItem): string | undefined {
    return item.file?.kind === 'image' ? item.file.originalPath : undefined;
}

function imageQuarterTurns(item: ListItem): QuarterTurn {
    return item.file?.kind === 'image' ? FileEditsVO.getImageQuarterTurn(item.edits) : 0;
}

function imageRotationDegrees(item: ListItem): number {
    return item.file?.kind === 'image' ? FileEditsVO.getImageRotationDegrees(item.edits) : 0;
}

function imageThumbState(
    imageUrl: string | null,
    imageFit: ImageFit,
    imageRotation: number,
    exportMatchedImageSrc: string | null | undefined,
): ImageThumbState {
    return {
        url: exportMatchedImageSrc ?? imageUrl,
        className: [
            'h-full w-full bg-white',
            exportMatchedImageSrc
                ? 'object-contain'
                : imageFit === 'cover'
                  ? 'object-cover'
                  : 'object-contain',
        ].join(' '),
        rotation: exportMatchedImageSrc ? 0 : imageRotation,
    };
}

function containerClassName(
    size: ThumbnailSize,
    isSelected: boolean,
    className: string | undefined,
): string {
    const base =
        size === 'lg'
            ? [
                  'thumb-card group relative mx-auto aspect-[3/4] w-full max-w-[352px] overflow-hidden rounded-lg border-2 bg-ui-surface-hover',
                  isSelected
                      ? 'border-[3px] border-ui-accent'
                      : 'border-ui-border hover:border-ui-accent/50',
              ]
            : ['group relative shrink-0 overflow-hidden rounded bg-ui-surface-hover'];

    return [...base, className].filter(Boolean).join(' ');
}

function containerStyle(size: ThumbnailSize): CSSProperties | undefined {
    return size === 'sm' ? { width: 60, height: 80 } : undefined;
}

function ThumbnailFallbackIcon({ isImage }: { isImage: boolean }) {
    return (
        <div className="flex h-full items-center justify-center">
            {isImage ? (
                <IconPhoto className="h-5 w-5 text-ui-kind-image" />
            ) : (
                <IconFileTypePdf className="h-5 w-5 text-ui-kind-pdf" />
            )}
        </div>
    );
}

function ThumbnailMedia({
    thumbUrl,
    imageThumb,
    isImage,
}: {
    thumbUrl: string | null | undefined;
    imageThumb: ImageThumbState;
    isImage: boolean;
}) {
    if (thumbUrl) {
        return <img src={thumbUrl} alt="" className="h-full w-full object-cover" />;
    }

    if (imageThumb.url) {
        return (
            <RotatedThumbnailImage
                src={imageThumb.url}
                alt=""
                className={imageThumb.className}
                imageRotation={imageThumb.rotation}
            />
        );
    }

    return <ThumbnailFallbackIcon isImage={isImage} />;
}

function LargeThumbnailCaption({
    fileName,
    detailLabel,
}: {
    fileName: string;
    detailLabel: string;
}) {
    return (
        <div className="absolute inset-x-0 bottom-0 z-30 px-2 py-1.5 text-white">
            <div className="absolute inset-0 bg-black/55" />
            <div className="relative flex min-w-0 items-center gap-1.5">
                <FinalDocumentDragHandle
                    className="shrink-0 flex h-7 w-7 items-center justify-center cursor-grab rounded-md text-white/90 hover:bg-white/10 active:cursor-grabbing"
                    iconClassName="h-5 w-5"
                />

                <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold">{fileName}</p>
                    <p className="truncate text-[10px] font-medium opacity-90">{detailLabel}</p>
                </div>
            </div>
        </div>
    );
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
    const isPdfPage = item.page.kind === 'pdf';
    const isImage = isImageItem(item);
    const thumbRequest = useMemo(
        () =>
            item.page.kind === 'pdf'
                ? buildThumbnailRenderRequest(item.page.pageNum, item.edits)
                : null,
        [item.edits, item.page],
    );
    const { dataUrl: thumbUrl, setTargetEl } = useLazyPdfRender(
        isPdfPage ? item.file : undefined,
        thumbRequest,
        scrollRoot,
    );
    const originalPath = imageOriginalPath(item);
    const imageUrl = originalPath ? getPreviewUrl(originalPath) : null;
    const quarterTurns = imageQuarterTurns(item);
    const rotation = imageRotationDegrees(item);
    const { exportMatchedImageSrc } = useExportMatchedImage(
        imageUrl ?? undefined,
        originalPath,
        imageFit,
        quarterTurns,
        isImage,
        size === 'lg' ? 360 : 120,
    );
    const imageThumb = imageThumbState(imageUrl, imageFit, rotation, exportMatchedImageSrc);

    return (
        <div
            ref={isPdfPage ? setTargetEl : undefined}
            className={containerClassName(size, item.isSelected, className)}
            style={containerStyle(size)}
        >
            <ThumbnailMedia thumbUrl={thumbUrl} imageThumb={imageThumb} isImage={isImage} />
            <PageQuickActions compact={size === 'sm'} onPreview={onPreview} />

            {size === 'lg' ? (
                <LargeThumbnailCaption
                    fileName={item.file?.name ?? '—'}
                    detailLabel={detailLabel}
                />
            ) : null}
        </div>
    );
}
