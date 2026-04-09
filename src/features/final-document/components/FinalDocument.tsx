import { IconColumns1, IconColumns2 } from '@tabler/icons-react';
import { useState } from 'react';
import type { FileEdits, FinalPage, RotationDirection, SourceFile } from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { SectionHeader } from '@/shared/ui/layout/SectionHeader';
import { CardList } from './components/CardList';
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
    const [layout, setLayout] = useState<'columns-2' | 'columns-1'>('columns-2');
    const [previewTargetId, setPreviewTargetId] = useState<string | null>(null);
    const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <SectionHeader
                title={t('finalDocument.sectionTitle', { count: finalPages.length })}
                className="border-b border-ui-border"
            >
                <button
                    type="button"
                    className={['btn-icon', layout === 'columns-1' ? 'btn-icon-active' : '']
                        .filter(Boolean)
                        .join(' ')}
                    onClick={() => setLayout('columns-1')}
                    aria-label={t('finalDocument.layoutColumns1')}
                    title={t('finalDocument.layoutColumns1')}
                >
                    <IconColumns1 className="h-5 w-5" />
                </button>
                <button
                    type="button"
                    className={['btn-icon', layout === 'columns-2' ? 'btn-icon-active' : '']
                        .filter(Boolean)
                        .join(' ')}
                    onClick={() => setLayout('columns-2')}
                    aria-label={t('finalDocument.layoutColumns2')}
                    title={t('finalDocument.layoutColumns2')}
                >
                    <IconColumns2 className="h-5 w-5 rotate-90" />
                </button>
            </SectionHeader>

            <div ref={setScrollRoot} className="min-h-0 flex-1 overflow-y-auto p-4">
                {layout === 'columns-2' ? (
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
                ) : (
                    <CardList
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
                )}
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
