import { memo } from 'react';
import type { ListItem } from '../list-item.types';
import { FinalDocumentRowShell } from './FinalDocumentRowShell';
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
}: Props) {
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
