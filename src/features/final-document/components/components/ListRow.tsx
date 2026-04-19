import { memo } from 'react';
import { useTranslation } from '@/shared/i18n';
import { FinalDocumentRowShell } from './FinalDocumentRowShell';
import type { FinalDocumentRowProps } from './FinalDocumentSortableList';
import { ListRowThumbnail } from './ListRowThumbnail';

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
    onMoveTo,
    totalItems,
}: FinalDocumentRowProps) {
    const { t } = useTranslation();

    return (
        <FinalDocumentRowShell
            item={item}
            isFirst={isFirst}
            isLast={isLast}
            onMoveUp={onMoveUp}
            onMoveDown={onMoveDown}
            onRemove={onRemove}
            onSelect={onSelect}
            flashKey={flashKey}
            flashOverlayClassName="inset-0 rounded-xl"
            cardClassName={[
                'group relative flex min-h-[6.25rem] min-w-0 flex-1 cursor-pointer items-center gap-4 rounded-2xl border p-4 pr-12 transition-colors',
                item.isSelected
                    ? 'border-ui-accent-muted bg-ui-surface shadow-sm'
                    : 'border-ui-border bg-ui-surface hover:border-ui-border-hover',
            ].join(' ')}
            onMoveTo={onMoveTo}
            totalItems={totalItems}
        >
            <ListRowThumbnail item={item} scrollRoot={scrollRoot} onPreview={onPreview} />

            <div className="flex min-w-0 flex-1 items-start justify-between gap-4">
                <div className="min-w-0">
                    {item.page.kind === 'pdf' ? (
                        <p className="label-caps text-ui-kind-pdf">
                            {t('finalDocument.pageLabel', { pageNum: item.page.pageNum })}
                        </p>
                    ) : item.page.kind === 'image' ? (
                        <p className="label-caps text-ui-kind-image">
                            {t('finalDocument.imageLabel')}
                        </p>
                    ) : null}
                    <p className="mt-1 truncate text-sm font-semibold text-ui-text">
                        {item.file?.name ?? '—'}
                    </p>
                </div>

                <span className="hidden shrink-0 rounded-full bg-ui-surface-hover px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-ui-text-muted md:inline-flex">
                    {item.file?.kind === 'image' ? 'IMG' : 'PDF'}
                </span>
            </div>
        </FinalDocumentRowShell>
    );
});
