import { useMemo } from 'react';

import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import { FileEditsVO } from '@/shared/domain/value-objects/file-edits.vo';
import type { ListItem } from './list-item.types';

type UseFinalDocumentItemsArgs = {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedPageId: string | null;
    editsByFile: Record<string, FileEdits>;
};

export function useFinalDocumentItems({
    finalPages,
    files,
    selectedPageId,
    editsByFile,
}: UseFinalDocumentItemsArgs) {
    const fileMap = useMemo(() => new Map(files.map((file) => [file.id, file])), [files]);

    const items = useMemo<ListItem[]>(
        () =>
            finalPages.map((page, index) => ({
                page,
                file: fileMap.get(page.fileId),
                edits: editsByFile[page.fileId] ?? FileEditsVO.empty(),
                index,
                isSelected: page.id === selectedPageId,
            })),
        [editsByFile, fileMap, finalPages, selectedPageId],
    );

    const sortableItems = useMemo(() => items.map((item) => item.page.id), [items]);

    return { items, sortableItems };
}
