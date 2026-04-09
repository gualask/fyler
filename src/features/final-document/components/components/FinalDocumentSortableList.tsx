import {
    closestCenter,
    DndContext,
    type DragEndEvent,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconFile } from '@tabler/icons-react';
import type { ReactNode } from 'react';
import { useCallback, useEffect } from 'react';

import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { scrollIntoViewByDataAttr } from '@/shared/ui/scroll/scroll-into-view';
import type { ListItem } from '../list-item.types';
import { useFinalDocumentItems } from '../use-final-document-items.hook';

export interface FinalDocumentRowProps {
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

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedPageId: string | null;
    selectedPageScrollKey?: number;
    editsByFile: Record<string, FileEdits>;
    scrollRoot: HTMLDivElement | null;
    onReorder: (fromId: string, toId: string) => void;
    onRemove: (id: string) => void;
    onSelectPage: (fileId: string, pageNum: number) => void;
    onPreviewPage: (id: string) => void;
    gapClassName: string;
    Row: (props: FinalDocumentRowProps) => ReactNode;
}

export function FinalDocumentSortableList({
    finalPages,
    files,
    selectedPageId,
    selectedPageScrollKey,
    editsByFile,
    scrollRoot,
    onReorder,
    onRemove,
    onSelectPage,
    onPreviewPage,
    gapClassName,
    Row,
}: Props) {
    const { t } = useTranslation();
    const { items, sortableItems } = useFinalDocumentItems({
        finalPages,
        files,
        selectedPageId,
        editsByFile,
    });
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

    const move = useCallback(
        (item: ListItem, toId: string | null) => {
            if (!toId) return;

            const wasSelected = item.page.id === selectedPageId;
            if (!wasSelected) {
                onSelectPage(item.page.fileId, item.page.pageNum);
            }

            onReorder(item.page.id, toId);

            // Avoid double scroll:
            // - If selection changes, the useEffect below will scroll the new selection into view.
            // - If selection doesn't change, we must scroll explicitly after reorder.
            if (wasSelected) {
                scrollIntoViewByDataAttr({
                    root: scrollRoot,
                    attr: 'data-final-page-id',
                    value: item.page.id,
                    signal: Date.now(),
                });
            }
        },
        [onReorder, onSelectPage, scrollRoot, selectedPageId],
    );

    useEffect(() => {
        if (!selectedPageId || !scrollRoot) return;
        return scrollIntoViewByDataAttr({
            root: scrollRoot,
            attr: 'data-final-page-id',
            value: selectedPageId,
            signal: selectedPageScrollKey,
        });
    }, [scrollRoot, selectedPageId, selectedPageScrollKey]);

    const handleDragEnd = useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
                onReorder(String(active.id), String(over.id));
            }
        },
        [onReorder],
    );

    if (items.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-ui-text-muted">
                <IconFile className="h-8 w-8 opacity-25" />
                <p className="text-center text-xs">{t('finalDocument.empty')}</p>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                <div className={['flex flex-col', gapClassName].filter(Boolean).join(' ')}>
                    {items.map((item, i) => {
                        const previousId = items[i - 1]?.page.id ?? null;
                        const nextId = items[i + 1]?.page.id ?? null;

                        return (
                            <Row
                                key={item.page.id}
                                item={item}
                                isFirst={i === 0}
                                isLast={i === items.length - 1}
                                scrollRoot={scrollRoot}
                                onMoveUp={() => move(item, previousId)}
                                onMoveDown={() => move(item, nextId)}
                                onRemove={onRemove}
                                onSelect={() => onSelectPage(item.page.fileId, item.page.pageNum)}
                                onPreview={() => onPreviewPage(item.page.id)}
                                flashKey={
                                    item.page.id === selectedPageId
                                        ? selectedPageScrollKey
                                        : undefined
                                }
                            />
                        );
                    })}
                </div>
            </SortableContext>
        </DndContext>
    );
}
