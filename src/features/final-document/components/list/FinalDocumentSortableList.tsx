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

import type { FileEdits, FinalPage, ImageFit, SourceFile, SourceTarget } from '@/shared/domain';
import { finalPageToTarget } from '@/shared/domain/utils/final-page-id';
import { useTranslation } from '@/shared/i18n';
import { scrollIntoViewByDataAttr } from '@/shared/ui/scroll/scroll-into-view';
import type { ListItem } from './list-item.types';
import { useFinalDocumentItems } from './use-final-document-items.hook';

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
}

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    imageFit: ImageFit;
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

type MoveFinalPageOptions = {
    selectedPageId: string | null;
    scrollRoot: HTMLDivElement | null;
    onReorder: (fromId: string, toId: string) => void;
    onSelectPage: (fileId: string, target: SourceTarget) => void;
};

type FinalDocumentRowsProps = {
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
};

const FINAL_PAGE_ATTR = 'data-final-page-id';

function listClassName(base: string, extra?: string): string {
    return [base, extra].filter(Boolean).join(' ');
}

function EmptyFinalDocument({ label }: { label: string }) {
    return (
        <div className="flex h-full items-center justify-center">
            <div className="flex w-full max-w-sm flex-col items-center gap-3 rounded-2xl border border-ui-border bg-ui-surface px-6 py-8 text-center text-ui-text-muted shadow-sm">
                <IconFile className="h-8 w-8 opacity-30" />
                <p className="text-sm font-medium text-ui-text">{label}</p>
            </div>
        </div>
    );
}

function scrollFinalPageIntoView(
    scrollRoot: HTMLDivElement | null,
    pageId: string,
    signal?: number,
) {
    return scrollIntoViewByDataAttr({
        root: scrollRoot,
        attr: FINAL_PAGE_ATTR,
        value: pageId,
        signal,
    });
}

function useSelectedPageScroll(
    scrollRoot: HTMLDivElement | null,
    selectedPageId: string | null,
    selectedPageScrollKey: number | undefined,
) {
    useEffect(() => {
        if (!selectedPageId || !scrollRoot) return;
        return scrollFinalPageIntoView(scrollRoot, selectedPageId, selectedPageScrollKey);
    }, [scrollRoot, selectedPageId, selectedPageScrollKey]);
}

function useMoveFinalPage({
    selectedPageId,
    scrollRoot,
    onReorder,
    onSelectPage,
}: MoveFinalPageOptions) {
    return useCallback(
        (item: ListItem, toId: string | null) => {
            if (!toId) return;

            const wasSelected = item.page.id === selectedPageId;
            if (!wasSelected) {
                onSelectPage(item.page.fileId, finalPageToTarget(item.page));
            }

            onReorder(item.page.id, toId);

            // Avoid double scroll: selection changes scroll via useSelectedPageScroll.
            if (wasSelected) {
                scrollFinalPageIntoView(scrollRoot, item.page.id, Date.now());
            }
        },
        [onReorder, onSelectPage, scrollRoot, selectedPageId],
    );
}

function useDragEndReorder(onReorder: (fromId: string, toId: string) => void) {
    return useCallback(
        (event: DragEndEvent) => {
            const { active, over } = event;
            if (over && active.id !== over.id) {
                onReorder(String(active.id), String(over.id));
            }
        },
        [onReorder],
    );
}

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

function FinalDocumentRows({
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
}: FinalDocumentRowsProps) {
    return items.map((item, index) => {
        const previousId = items[index - 1]?.page.id ?? null;
        const nextId = items[index + 1]?.page.id ?? null;

        return (
            <Row
                key={item.page.id}
                item={item}
                imageFit={imageFit}
                isFirst={index === 0}
                isLast={index === items.length - 1}
                scrollRoot={scrollRoot}
                onMoveUp={() => onMove(item, previousId)}
                onMoveDown={() => onMove(item, nextId)}
                onRemove={onRemove}
                onSelect={() => onSelectPage(item.page.fileId, finalPageToTarget(item.page))}
                onPreview={() => onPreviewPage(item.page.id)}
                flashKey={rowFlashKey(item, selectedPageId, selectedPageScrollKey)}
                onMoveTo={moveToIndexHandler(item, onMovePageToIndex)}
                totalItems={onMovePageToIndex ? items.length : undefined}
            />
        );
    });
}

export function FinalDocumentSortableList({
    finalPages,
    files,
    imageFit,
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

    const move = useMoveFinalPage({ selectedPageId, scrollRoot, onReorder, onSelectPage });
    const handleDragEnd = useDragEndReorder(onReorder);
    useSelectedPageScroll(scrollRoot, selectedPageId, selectedPageScrollKey);

    if (items.length === 0) {
        return <EmptyFinalDocument label={t('finalDocument.empty')} />;
    }

    return (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                <div className={listClassName('mx-auto w-full', stackClassName)}>
                    <div className={listClassName('flex flex-col', gapClassName)}>
                        <FinalDocumentRows
                            items={items}
                            imageFit={imageFit}
                            selectedPageId={selectedPageId}
                            selectedPageScrollKey={selectedPageScrollKey}
                            scrollRoot={scrollRoot}
                            Row={Row}
                            onMove={move}
                            onRemove={onRemove}
                            onSelectPage={onSelectPage}
                            onPreviewPage={onPreviewPage}
                            onMovePageToIndex={onMovePageToIndex}
                        />
                    </div>
                </div>
            </SortableContext>
        </DndContext>
    );
}
