import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import { CardRow } from './CardRow';
import { FinalDocumentSortableList } from './FinalDocumentSortableList';

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
}

export function CardList({
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
}: Props) {
    return (
        <FinalDocumentSortableList
            finalPages={finalPages}
            files={files}
            selectedPageId={selectedPageId}
            selectedPageScrollKey={selectedPageScrollKey}
            editsByFile={editsByFile}
            scrollRoot={scrollRoot}
            onReorder={onReorder}
            onRemove={onRemove}
            onSelectPage={onSelectPage}
            onPreviewPage={onPreviewPage}
            gapClassName="gap-4"
            Row={CardRow}
        />
    );
}
