import { IconFileTypePdf, IconPhoto } from '@tabler/icons-react';
import { useMemo } from 'react';
import { buildThumbnailRenderRequest, useLazyPdfRender } from '@/infra/pdf';
import { getPreviewUrl } from '@/infra/platform';
import { getImageRotationDegrees } from '@/shared/domain/file-edits';
import { PageQuickActions } from '@/shared/ui/actions/PageQuickActions';
import type { ListItem } from '../list-item.types';

interface Props {
    item: ListItem;
    scrollRoot: HTMLDivElement | null;
    onPreview: () => void;
}

export function ListRowThumbnail({ item, scrollRoot, onPreview }: Props) {
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

    return (
        <div
            ref={item.file?.kind === 'pdf' ? setTargetEl : undefined}
            className="group relative shrink-0 overflow-hidden rounded bg-ui-surface-hover"
            style={{ width: 60, height: 80 }}
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
            <PageQuickActions compact onPreview={onPreview} />
        </div>
    );
}
