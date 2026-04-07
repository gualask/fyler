import { useState } from 'react';

import type { FileEdits, FinalPage, SourceFile } from '@/shared/domain';
import type { RotationDirection } from '@/shared/domain/file-edits';
import { useTranslation } from '@/shared/i18n';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { List } from './components/List';
import { Preview } from './components/Preview';

interface Props {
    finalPages: FinalPage[];
    files: SourceFile[];
    selectedPageId: string | null;
    selectedPageScrollKey?: number;
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
    selectedPageScrollKey,
    onReorder,
    onMovePageToIndex,
    onRemove,
    onSelectPage,
    onRotatePage,
    editsByFile,
}: Props) {
    const { t } = useTranslation();
    const [previewTargetId, setPreviewTargetId] = useState<string | null>(null);
    const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <SectionHeader
                title={t('finalDocument.sectionTitle', { count: finalPages.length })}
                className="border-b border-ui-border"
            />

            <div ref={setScrollRoot} className="min-h-0 flex-1 overflow-y-auto p-4">
                <List
                    finalPages={finalPages}
                    files={files}
                    selectedPageId={selectedPageId}
                    selectedPageScrollKey={selectedPageScrollKey}
                    editsByFile={editsByFile}
                    scrollRoot={scrollRoot}
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
