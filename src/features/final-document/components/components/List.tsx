import type { FileEdits, FinalPage, SourceFile, SourceTarget } from '@/shared/domain';
import { FinalDocumentSortableList } from './FinalDocumentSortableList';
import { ListRow } from './ListRow';

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
    onMovePageToIndex?: (id: string, targetIndex: number) => void;
}

export function List({
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
    onMovePageToIndex,
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
            gapClassName="gap-3"
            Row={ListRow}
            onMovePageToIndex={onMovePageToIndex}
        />
    );
}
