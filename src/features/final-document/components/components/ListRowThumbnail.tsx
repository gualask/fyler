import { IconFileTypePdf, IconPhoto } from '@tabler/icons-react';
import { useMemo } from 'react';
import { buildThumbnailRenderRequest, useLazyPdfRender } from '@/infra/pdf';
import { getPreviewUrl } from '@/infra/platform';
import { getImageRotationDegrees } from '@/shared/domain/file-edits';
import { useTranslation } from '@/shared/i18n';
import { PageQuickActions } from '@/shared/ui/actions/PageQuickActions';
import type { ListItem } from '../list-item.types';
import { FinalDocumentDragHandle } from './FinalDocumentRowShell';

interface Props {
    item: ListItem;
    scrollRoot: HTMLDivElement | null;
    onPreview: () => void;
    size?: 'sm' | 'lg';
    className?: string;
}

export function ListRowThumbnail({ item, scrollRoot, onPreview, size = 'sm', className }: Props) {
    const { t } = useTranslation();
    const thumbRequest = useMemo(
        () =>
            item.file?.kind === 'pdf'
                ? buildThumbnailRenderRequest(item.page.pageNum, item.edits)
                : null,
        [item.edits, item.file, item.page.pageNum],
    );
    const { dataUrl: thumbUrl, setTargetEl } = useLazyPdfRender(
        item.file?.kind === 'pdf' ? item.file : undefined,
        thumbRequest,
        scrollRoot,
    );
    const imageUrl = item.file?.kind === 'image' ? getPreviewUrl(item.file.originalPath) : null;
    const imageRotation = item.file?.kind === 'image' ? getImageRotationDegrees(item.edits) : 0;

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
            ref={item.file?.kind === 'pdf' ? setTargetEl : undefined}
            className={containerClassName}
            style={size === 'sm' ? { width: 60, height: 80 } : undefined}
        >
            {thumbUrl ? (
                <img src={thumbUrl} alt="" className="h-full w-full object-cover" />
            ) : imageUrl ? (
                <img
                    src={imageUrl}
                    alt=""
                    className="h-full w-full object-cover"
                    style={{ transform: `rotate(${imageRotation}deg)` }}
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
                            {item.file?.kind === 'pdf' ? (
                                <p className="truncate text-[10px] font-medium opacity-90">
                                    {t('finalDocument.pageLabel', { pageNum: item.page.pageNum })}
                                </p>
                            ) : item.file?.kind === 'image' ? (
                                <p className="truncate text-[10px] font-medium opacity-90">
                                    {t('finalDocument.imageLabel')}
                                </p>
                            ) : null}
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
