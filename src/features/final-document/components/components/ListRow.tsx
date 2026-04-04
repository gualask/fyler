import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconX } from '@tabler/icons-react';
import { memo } from 'react';
import { useTranslation } from '@/shared/i18n';
import { FocusFlashOverlay } from '@/shared/ui/feedback/FocusFlashOverlay';
import type { ListItem } from '../list-item.types';
import { ListRowIndexControls } from './ListRowIndexControls';
import { ListRowThumbnail } from './ListRowThumbnail';

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
    flashKey?: number;
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
    flashKey,
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

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-final-page-id={item.page.id}
            {...attributes}
            className={['flex min-w-0 items-center gap-3', isDragging ? 'opacity-50' : ''].join(
                ' ',
            )}
        >
            <ListRowIndexControls
                indexLabel={item.index + 1}
                isFirst={isFirst}
                isLast={isLast}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
            />

            <div
                onClick={onSelect}
                className={[
                    'group relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                    item.isSelected
                        ? 'border-ui-accent bg-ui-surface'
                        : 'border-ui-border bg-ui-surface',
                ].join(' ')}
            >
                {item.isSelected && flashKey && (
                    <FocusFlashOverlay flashKey={flashKey} className="inset-0 rounded-xl" />
                )}
                <div
                    {...listeners}
                    onClick={(e) => e.stopPropagation()}
                    className="shrink-0 cursor-grab text-ui-text-muted active:cursor-grabbing"
                >
                    <IconGripVertical className="h-5 w-5" />
                </div>

                <ListRowThumbnail item={item} scrollRoot={scrollRoot} onPreview={onPreview} />

                <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-ui-text">
                        {item.file?.name ?? '—'}
                    </p>
                    {item.file?.kind === 'pdf' ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-ui-kind-pdf">
                            {t('finalDocument.pageLabel', { pageNum: item.page.pageNum })}
                        </p>
                    ) : item.file?.kind === 'image' ? (
                        <p className="mt-0.5 text-[11px] font-semibold text-ui-kind-image">
                            {t('finalDocument.imageLabel')}
                        </p>
                    ) : null}
                </div>

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.page.id);
                    }}
                    className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-ui-danger text-white shadow-md transition-colors hover:bg-ui-danger-hover group-hover:flex"
                    title={t('finalDocument.removePage')}
                >
                    <IconX className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
});
