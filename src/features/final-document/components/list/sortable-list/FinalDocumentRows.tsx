import type { ReactNode } from 'react';
import { memo, useCallback, useMemo } from 'react';

import type { ImageFit, SourceTarget } from '@/shared/domain';
import { finalPageToTarget } from '@/shared/domain/utils/final-page-id';
import type { ListItem } from '../list-item.types';

export interface FinalDocumentRowProps {
    item: ListItem;
    imageFit: ImageFit;
    isFirst: boolean;
    isLast: boolean;
    scrollRoot: HTMLDivElement | null;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: (id: string) => void;
    onSelect: () => void;
    onPreview: () => void;
    flashKey?: number;
    onMoveTo?: (targetIndex: number) => void;
    totalItems?: number;
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragCancel: () => void;
}

type Props = {
    items: ListItem[];
    imageFit: ImageFit;
    selectedPageId: string | null;
    selectedPageScrollKey?: number;
    scrollRoot: HTMLDivElement | null;
    Row: (props: FinalDocumentRowProps) => ReactNode;
    onMove: (item: ListItem, toId: string | null) => void;
    onRemove: (id: string) => void;
    onSelectPage: (fileId: string, target: SourceTarget) => void;
    onPreviewPage: (id: string) => void;
    onMovePageToIndex?: (id: string, targetIndex: number) => void;
    activeDragId: string | null;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDragCancel: () => void;
};

type FinalDocumentRowEntryProps = {
    item: ListItem;
    imageFit: ImageFit;
    previousId: string | null;
    nextId: string | null;
    isFirst: boolean;
    isLast: boolean;
    scrollRoot: HTMLDivElement | null;
    Row: (props: FinalDocumentRowProps) => ReactNode;
    selectedPageId: string | null;
    selectedPageScrollKey?: number;
    onMove: (item: ListItem, toId: string | null) => void;
    onRemove: (id: string) => void;
    onSelectPage: (fileId: string, target: SourceTarget) => void;
    onPreviewPage: (id: string) => void;
    onMovePageToIndex?: (id: string, targetIndex: number) => void;
    totalItems: number;
    isDragging: boolean;
    onDragStart: (id: string) => void;
    onDragEnd: () => void;
    onDragCancel: () => void;
};

function rowFlashKey(
    item: ListItem,
    selectedPageId: string | null,
    selectedPageScrollKey: number | undefined,
): number | undefined {
    return item.page.id === selectedPageId ? selectedPageScrollKey : undefined;
}

function moveToIndexHandler(
    item: ListItem,
    onMovePageToIndex: ((id: string, targetIndex: number) => void) | undefined,
) {
    return onMovePageToIndex
        ? (targetIndex: number) => onMovePageToIndex(item.page.id, targetIndex)
        : undefined;
}

const FinalDocumentRowEntry = memo(function FinalDocumentRowEntry({
    item,
    imageFit,
    previousId,
    nextId,
    isFirst,
    isLast,
    scrollRoot,
    Row,
    selectedPageId,
    selectedPageScrollKey,
    onMove,
    onRemove,
    onSelectPage,
    onPreviewPage,
    onMovePageToIndex,
    totalItems,
    isDragging,
    onDragStart,
    onDragEnd,
    onDragCancel,
}: FinalDocumentRowEntryProps) {
    const moveUp = useCallback(() => onMove(item, previousId), [item, onMove, previousId]);
    const moveDown = useCallback(() => onMove(item, nextId), [item, nextId, onMove]);
    const select = useCallback(
        () => onSelectPage(item.page.fileId, finalPageToTarget(item.page)),
        [item, onSelectPage],
    );
    const preview = useCallback(() => onPreviewPage(item.page.id), [item, onPreviewPage]);
    const moveTo = useMemo(
        () => moveToIndexHandler(item, onMovePageToIndex),
        [item, onMovePageToIndex],
    );
    const startDrag = useCallback(() => onDragStart(item.page.id), [item, onDragStart]);

    return (
        <Row
            item={item}
            imageFit={imageFit}
            isFirst={isFirst}
            isLast={isLast}
            scrollRoot={scrollRoot}
            onMoveUp={moveUp}
            onMoveDown={moveDown}
            onRemove={onRemove}
            onSelect={select}
            onPreview={preview}
            flashKey={rowFlashKey(item, selectedPageId, selectedPageScrollKey)}
            onMoveTo={moveTo}
            totalItems={onMovePageToIndex ? totalItems : undefined}
            isDragging={isDragging}
            onDragStart={startDrag}
            onDragEnd={onDragEnd}
            onDragCancel={onDragCancel}
        />
    );
});

export function FinalDocumentRows({
    items,
    imageFit,
    selectedPageId,
    selectedPageScrollKey,
    scrollRoot,
    Row,
    onMove,
    onRemove,
    onSelectPage,
    onPreviewPage,
    onMovePageToIndex,
    activeDragId,
    onDragStart,
    onDragEnd,
    onDragCancel,
}: Props) {
    return items.map((item, index) => {
        const previousId = items[index - 1]?.page.id ?? null;
        const nextId = items[index + 1]?.page.id ?? null;

        return (
            <FinalDocumentRowEntry
                key={item.page.id}
                Row={Row}
                item={item}
                imageFit={imageFit}
                previousId={previousId}
                nextId={nextId}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                scrollRoot={scrollRoot}
                onMove={onMove}
                onRemove={onRemove}
                onSelectPage={onSelectPage}
                onPreviewPage={onPreviewPage}
                selectedPageId={selectedPageId}
                selectedPageScrollKey={selectedPageScrollKey}
                onMovePageToIndex={onMovePageToIndex}
                totalItems={items.length}
                isDragging={item.page.id === activeDragId}
                onDragStart={onDragStart}
                onDragEnd={onDragEnd}
                onDragCancel={onDragCancel}
            />
        );
    });
}
