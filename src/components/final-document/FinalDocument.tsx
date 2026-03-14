import { useState } from 'react';

import type { FileEdits, FinalPage, SourceFile } from '../../domain';
import type { RotationDirection } from '../../fileEdits';
import { useTranslation } from '../../i18n';
import { ColumnHeader } from '../shared/layout/ColumnHeader';
import { List } from './components/List';
import { Preview } from './components/Preview';

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedPageId: string | null;
    onReorder: (fromId: string, toId: string) => void;
    onMovePageToIndex: (id: string, targetIndex: number) => void;
    onRemove: (id: string) => void;
    onSelectPage: (fileId: string, pageNum: number) => void;
    onRotatePage: (fileId: string, pageNum: number, direction: RotationDirection) => Promise<void>;
    editsByFile: Record<string, FileEdits>;
}

export function FinalDocument({
    finalPages,
    files,
    selectedPageId,
    onReorder,
    onMovePageToIndex,
    onRemove,
    onSelectPage,
    onRotatePage,
    editsByFile,
}: Props) {
    const { t } = useTranslation();
    const [previewTargetId, setPreviewTargetId] = useState<string | null>(null);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <ColumnHeader title={t('finalDocument.title')}>
                <span className="column-toolbar-stat">{t('finalDocument.pageCount', { count: finalPages.length })}</span>
            </ColumnHeader>

            <div className="min-h-0 flex-1 overflow-y-auto p-4">
                <List
                    finalPages={finalPages}
                    files={files}
                    selectedPageId={selectedPageId}
                    editsByFile={editsByFile}
                    onReorder={onReorder}
                    onRemove={onRemove}
                    onSelectPage={onSelectPage}
                    onPreviewPage={setPreviewTargetId}
                />
            </div>

            <Preview
                previewTargetId={previewTargetId}
                finalPages={finalPages}
                files={files}
                editsByFile={editsByFile}
                onMovePageToIndex={onMovePageToIndex}
                onRotatePage={onRotatePage}
                onClose={() => setPreviewTargetId(null)}
            />
        </div>
    );
}
