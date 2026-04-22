import { IconColumns1, IconColumns2 } from '@tabler/icons-react';
import { useState } from 'react';
import type {
    FileEdits,
    FinalPage,
    RotationDirection,
    SourceFile,
    SourceTarget,
} from '@/shared/domain';
import { useTranslation } from '@/shared/i18n';
import { usePreferences, type FinalDocumentLayout } from '@/shared/preferences';
import { ToggleGroup, type ToggleOption } from '@/shared/ui';
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
    onSelectPage: (fileId: string, target: SourceTarget) => void;
    onRotatePage: (
        fileId: string,
        target: SourceTarget,
        direction: RotationDirection,
    ) => Promise<void>;
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
    const { finalDocumentLayout, setFinalDocumentLayout } = usePreferences();
    const [previewTargetId, setPreviewTargetId] = useState<string | null>(null);
    const [scrollRoot, setScrollRoot] = useState<HTMLDivElement | null>(null);
    const layoutOptions: ToggleOption<FinalDocumentLayout>[] = [
        {
            value: 'columns-1',
            label: <IconColumns1 className="h-4 w-4" />,
            ariaLabel: t('finalDocument.layoutColumns1'),
            title: t('finalDocument.layoutColumns1'),
            buttonClassName: 'min-w-0 px-0',
        },
        {
            value: 'columns-2',
            label: <IconColumns2 className="h-4 w-4 rotate-90" />,
            ariaLabel: t('finalDocument.layoutColumns2'),
            title: t('finalDocument.layoutColumns2'),
            buttonClassName: 'min-w-0 px-0',
        },
    ];

    return (
        <div className="flex h-full flex-col overflow-hidden">
            <SectionHeader
                title={t('finalDocument.sectionTitle', { count: finalPages.length })}
                className="border-b border-ui-border"
            >
                <ToggleGroup
                    className="w-16 shrink-0"
                    options={layoutOptions}
                    value={finalDocumentLayout}
                    onChange={setFinalDocumentLayout}
                />
            </SectionHeader>

            <div
                ref={setScrollRoot}
                className="min-h-0 flex-1 overflow-y-auto px-5 py-4 md:px-6 md:py-5"
            >
                {finalDocumentLayout === 'columns-2' ? (
                    <List
                        finalPages={finalPages}
                        files={files}
                        selectedPageId={selectedPageId}
                        selectedPageScrollKey={selectedPageScrollKey}
                        editsByFile={editsByFile}
                        scrollRoot={scrollRoot}
                        onReorder={onReorder}
                        onMovePageToIndex={onMovePageToIndex}
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
                        onMovePageToIndex={onMovePageToIndex}
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
