import { useMemo } from 'react';

import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import { emptyFileEdits } from '@/shared/domain/file-edits';
import type { ListItem } from './list-item.types';

export function useFinalDocumentItems({
    finalPages,
    files,
    selectedPageId,
    editsByFile,
}: {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedPageId: string | null;
    editsByFile: Record<string, FileEdits>;
}) {
    const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);

    const items = useMemo<ListItem[]>(
        () =>
            finalPages.map((page, index) => ({
                page,
                file: fileMap.get(page.fileId),
                edits: editsByFile[page.fileId] ?? emptyFileEdits(),
                index,
                isSelected: page.id === selectedPageId,
            })),
        [editsByFile, fileMap, finalPages, selectedPageId],
    );

    const sortableItems = useMemo(() => items.map((item) => item.page.id), [items]);

    return { items, sortableItems };
}
