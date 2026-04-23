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

import type { FileEdits, FinalPage, SourceFile, SourceTarget } from '@/shared/domain';
import { finalPageToTarget } from '@/shared/domain/utils/final-page-id';
import { useTranslation } from '@/shared/i18n';
import { scrollIntoViewByDataAttr } from '@/shared/ui/scroll/scroll-into-view';
import type { ListItem } from './list-item.types';
import { useFinalDocumentItems } from './use-final-document-items.hook';

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
    onMoveTo?: (targetIndex: number) => void;
    totalItems?: number;
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
    onSelectPage: (fileId: string, target: SourceTarget) => void;
    onPreviewPage: (id: string) => void;
    gapClassName: string;
    stackClassName?: string;
    Row: (props: FinalDocumentRowProps) => ReactNode;
    onMovePageToIndex?: (id: string, targetIndex: number) => void;
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
    stackClassName,
    Row,
    onMovePageToIndex,
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
                onSelectPage(item.page.fileId, finalPageToTarget(item.page));
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
            <div className="flex h-full items-center justify-center">
                <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-ui-border bg-ui-surface px-6 py-8 text-center text-ui-text-muted shadow-sm">
                    <IconFile className="h-8 w-8 opacity-30" />
                    <p className="text-sm font-medium text-ui-text">{t('finalDocument.empty')}</p>
                </div>
            </div>
        );
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                <div className={['mx-auto w-full', stackClassName].filter(Boolean).join(' ')}>
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
                                    onSelect={() =>
                                        onSelectPage(item.page.fileId, finalPageToTarget(item.page))
                                    }
                                    onPreview={() => onPreviewPage(item.page.id)}
                                    flashKey={
                                        item.page.id === selectedPageId
                                            ? selectedPageScrollKey
                                            : undefined
                                    }
                                    onMoveTo={
                                        onMovePageToIndex
                                            ? (targetIndex) =>
                                                  onMovePageToIndex(item.page.id, targetIndex)
                                            : undefined
                                    }
                                    totalItems={onMovePageToIndex ? items.length : undefined}
                                />
                            );
                        })}
                    </div>
                </div>
            </SortableContext>
        </DndContext>
    );
}
