import { useCallback, useMemo } from 'react';
import {
    DndContext,
    closestCenter,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent,
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { IconFile } from '@tabler/icons-react';

import type { FileEdits, FinalPage, SourceFile } from '@/domain';
import { emptyFileEdits } from '@/domain/fileEdits';
import { useTranslation } from '@/i18n';
import { ListRow } from './ListRow';
import type { ListItem } from '../models/listItem';

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedPageId: string | null;
    editsByFile: Record<string, FileEdits>;
    scrollRoot: HTMLDivElement | null;
    onReorder: (fromId: string, toId: string) => void;
    onRemove: (id: string) => void;
    onSelectPage: (fileId: string, pageNum: number) => void;
    onPreviewPage: (id: string) => void;
}

export function List({
    finalPages,
    files,
    selectedPageId,
    editsByFile,
    scrollRoot,
    onReorder,
    onRemove,
    onSelectPage,
    onPreviewPage,
}: Props) {
    const { t } = useTranslation();
    const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);
    const items = useMemo<ListItem[]>(
        () => finalPages.map((page, index) => ({
            page,
            file: fileMap.get(page.fileId),
            edits: editsByFile[page.fileId] ?? emptyFileEdits(),
            index,
            isSelected: page.id === selectedPageId,
        })),
        [editsByFile, fileMap, finalPages, selectedPageId],
    );
    const sortableItems = useMemo(() => items.map((item) => item.page.id), [items]);
    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    );

    const handleDragEnd = useCallback((event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            onReorder(String(active.id), String(over.id));
        }
    }, [onReorder]);

    if (items.length === 0) {
        return (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-ui-text-muted">
                <IconFile className="h-8 w-8 opacity-25" />
                <p className="text-center text-xs">{t('finalDocument.empty')}</p>
            </div>
        );
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
        >
            <SortableContext items={sortableItems} strategy={verticalListSortingStrategy}>
                <div className="flex flex-col gap-3">
                    {items.map((item) => (
                        <ListRow
                            key={item.page.id}
                            item={item}
                            scrollRoot={scrollRoot}
                            onRemove={onRemove}
                            onSelect={() => onSelectPage(item.page.fileId, item.page.pageNum)}
                            onPreview={() => onPreviewPage(item.page.id)}
                        />
                    ))}
                </div>
            </SortableContext>
        </DndContext>
    );
}
