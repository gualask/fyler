import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
    IconChevronDown,
    IconChevronUp,
    IconFile,
    IconGripVertical,
    IconPhoto,
    IconX,
} from '@tabler/icons-react';
import { memo, useMemo } from 'react';

import { getImageRotationDegrees } from '@/domain/file-edits';
import { useTranslation } from '@/i18n';
import { buildThumbnailRenderRequest, useLazyPdfRender } from '@/pdf';
import { getPreviewUrl } from '@/platform';
import { PageQuickActions } from '../../shared/actions/PageQuickActions';
import type { ListItem } from '../models/list-item';

interface Props {
    item: ListItem;
    isFirst: boolean;
    isLast: boolean;
    scrollRoot: HTMLDivElement | null;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: (id: string) => void;
    onSelect: () => void;
    onPreview: () => void;
}

export const ListRow = memo(function ListRow({
    item,
    isFirst,
    isLast,
    scrollRoot,
    onMoveUp,
    onMoveDown,
    onRemove,
    onSelect,
    onPreview,
}: Props) {
    const { t } = useTranslation();
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: item.page.id,
    });

    const style: React.CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

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
            ref={setNodeRef}
            style={style}
            {...attributes}
            className={['flex min-w-0 items-center gap-3', isDragging ? 'opacity-50' : ''].join(
                ' ',
            )}
        >
            <div className="flex shrink-0 flex-col items-center gap-0.5">
                <button
                    type="button"
                    onClick={onMoveUp}
                    disabled={isFirst}
                    className="cursor-pointer rounded p-0.5 text-ui-text-muted transition-colors hover:text-ui-text disabled:invisible"
                >
                    <IconChevronUp className="h-4 w-4" />
                </button>
                <span className="text-xs font-bold text-ui-text-muted">{item.index + 1}</span>
                <button
                    type="button"
                    onClick={onMoveDown}
                    disabled={isLast}
                    className="cursor-pointer rounded p-0.5 text-ui-text-muted transition-colors hover:text-ui-text disabled:invisible"
                >
                    <IconChevronDown className="h-4 w-4" />
                </button>
            </div>

            <div
                onClick={onSelect}
                className={[
                    'group relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                    item.isSelected
                        ? 'border-ui-accent bg-ui-surface'
                        : 'border-ui-border bg-ui-surface',
                ].join(' ')}
            >
                <div
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 cursor-grab text-ui-text-muted active:cursor-grabbing"
                >
                    <IconGripVertical className="h-5 w-5" />
                </div>

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
                                <IconPhoto className="h-5 w-5 text-ui-text-muted" />
                            ) : (
                                <IconFile className="h-5 w-5 text-ui-text-muted" />
                            )}
                        </div>
                    )}
                    <PageQuickActions compact onPreview={onPreview} />
                </div>

                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ui-text">
                        {item.file?.name ?? '—'}
                    </p>
                    {item.file?.kind === 'pdf' && (
                        <p className="mt-0.5 text-[11px] font-semibold text-ui-accent-text">
                            {t('finalDocument.pageLabel', { pageNum: item.page.pageNum })}
                        </p>
                    )}
                </div>

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.page.id);
                    }}
                    className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-red-500 text-white shadow-md transition-colors hover:bg-red-600 group-hover:flex"
                    title={t('finalDocument.removePage')}
                >
                    <IconX className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
});
