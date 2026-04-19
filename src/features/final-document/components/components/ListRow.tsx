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
    const detailLabel =
        item.page.kind === 'pdf'
            ? t('finalDocument.pdfPageLabel', { pageNum: item.page.pageNum })
            : t('finalDocument.imageLabel');

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

            <div className="flex min-w-0 flex-1 items-start">
                <div className="min-w-0">
                    <p
                        className={[
                            'label-caps',
                            item.page.kind === 'pdf' ? 'text-ui-kind-pdf' : 'text-ui-kind-image',
                        ].join(' ')}
                    >
                        {detailLabel}
                    </p>
                    <p className="mt-1 truncate text-sm font-semibold text-ui-text">
                        {item.file?.name ?? '—'}
                    </p>
                </div>
            </div>
        </FinalDocumentRowShell>
    );
});
