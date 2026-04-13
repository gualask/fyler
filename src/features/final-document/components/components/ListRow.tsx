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
                'group relative flex min-w-0 flex-1 cursor-pointer items-center gap-3 rounded-xl border-2 p-3 transition-colors',
                item.isSelected
                    ? 'border-ui-accent bg-ui-surface'
                    : 'border-ui-border bg-ui-surface',
            ].join(' ')}
            onMoveTo={onMoveTo}
            totalItems={totalItems}
        >
            <ListRowThumbnail item={item} scrollRoot={scrollRoot} onPreview={onPreview} />

            <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-bold text-ui-text">{item.file?.name ?? '—'}</p>
                {item.page.kind === 'pdf' ? (
                    <p className="mt-0.5 text-[11px] font-semibold text-ui-kind-pdf">
                        {t('finalDocument.pageLabel', { pageNum: item.page.pageNum })}
                    </p>
                ) : item.page.kind === 'image' ? (
                    <p className="mt-0.5 text-[11px] font-semibold text-ui-kind-image">
                        {t('finalDocument.imageLabel')}
                    </p>
                ) : null}
            </div>
        </FinalDocumentRowShell>
    );
});
