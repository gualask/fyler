import { memo } from 'react';
import { FinalDocumentRowShell } from './FinalDocumentRowShell';
import type { FinalDocumentRowProps } from './FinalDocumentSortableList';
import { ListRowThumbnail } from './ListRowThumbnail';

export const CardRow = memo(function CardRow({
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
            flashOverlayClassName="inset-0 rounded-lg"
            cardClassName="group relative flex min-w-0 flex-1 items-center gap-3 transition-colors"
            hideDefaultDragHandle
            indexControlsSize="lg"
            onMoveTo={onMoveTo}
            totalItems={totalItems}
        >
            <ListRowThumbnail
                size="lg"
                item={item}
                scrollRoot={scrollRoot}
                onPreview={onPreview}
                className="min-w-0 flex-1"
            />
        </FinalDocumentRowShell>
    );
});
