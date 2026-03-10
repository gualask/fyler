import { memo } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Bars3Icon, DocumentIcon, PhotoIcon, XMarkIcon } from '@heroicons/react/24/outline';

import { getImageRotationDegrees } from '../../../fileEdits';
import { usePdfCache } from '../../../hooks/usePdfCache';
import { buildThumbnailRenderRequest } from '../../../pdfRenderProfiles';
import { getPreviewUrl } from '../../../platform';
import { PageQuickActions } from '../../shared/actions/PageQuickActions';
import type { ListItem } from '../models/listItem';

interface Props {
    item: ListItem;
    onRemove: (id: string) => void;
    onSelect: () => void;
    onPreview: () => void;
}

export const ListRow = memo(function ListRow({
    item,
    onRemove,
    onSelect,
    onPreview,
}: Props) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.page.id,
    });
    const { getRender } = usePdfCache();

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

    const thumbUrl = item.file?.kind === 'pdf'
        ? getRender(item.page.fileId, buildThumbnailRenderRequest(item.page.pageNum, item.edits))
        : null;
    const imageUrl = item.file?.kind === 'image' ? getPreviewUrl(item.file.originalPath) : null;
    const imageRotation = item.file?.kind === 'image' ? getImageRotationDegrees(item.edits) : 0;

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={['flex min-w-0 items-center gap-3', isDragging ? 'opacity-50' : ''].join(' ')}
        >
            <span className="w-4 shrink-0 text-center text-xs font-bold text-ui-text-muted">
                {item.index + 1}
            </span>

            <div
                onClick={onSelect}
                className={[
                    'group relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                    item.isSelected ? 'border-ui-accent bg-ui-surface' : 'border-ui-border bg-ui-surface',
                ].join(' ')}
            >
                <div
                    {...listeners}
                    onClick={(event) => event.stopPropagation()}
                    className="shrink-0 cursor-grab text-ui-text-muted active:cursor-grabbing"
                >
                    <Bars3Icon className="h-3.5 w-3.5" />
                </div>

                <div
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
                                <PhotoIcon className="h-5 w-5 text-ui-text-muted" />
                            ) : (
                                <DocumentIcon className="h-5 w-5 text-ui-text-muted" />
                            )}
                        </div>
                    )}
                    <PageQuickActions compact onPreview={onPreview} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ui-text">{item.file?.name ?? '—'}</p>
                    {item.file?.kind === 'pdf' && (
                        <p className="mt-0.5 text-[11px] font-semibold text-ui-accent-text">
                            Pagina {item.page.pageNum}
                        </p>
                    )}
                </div>

                <button
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.page.id);
                    }}
                    className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-colors hover:bg-red-600 group-hover:flex"
                >
                    <XMarkIcon className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
});
