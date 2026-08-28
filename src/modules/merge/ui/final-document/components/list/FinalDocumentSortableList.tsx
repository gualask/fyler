import { IconFile } from '@tabler/icons-react';
import { Reorder } from 'motion/react';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { SourceFile, SourceTarget } from '@/capabilities/document-sources';
import type { FileEdits, FinalPage, ImageFit } from '@/modules/merge/model';
import { finalPageToTarget } from '@/modules/merge/model';
import { useTranslation } from '@/shared/i18n';
import { scrollIntoViewByDataAttr } from '@/shared/ui/scroll/scroll-into-view';
import type { ListItem } from './list-item.types';
import { type FinalDocumentRowProps, FinalDocumentRows } from './sortable-list/FinalDocumentRows';
import { orderListItems } from './sortable-list/motion-reorder-session';
import { useFinalDocumentItems } from './sortable-list/use-final-document-items.hook';
import { useMotionReorderSession } from './sortable-list/use-motion-reorder-session.hook';

export type { FinalDocumentRowProps } from './sortable-list/FinalDocumentRows';

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
    const [reorderAnnouncement, setReorderAnnouncement] = useState('');

    const move = useMoveFinalPage({ selectedPageId, scrollRoot, onReorder, onSelectPage });
    const announceCommit = useCallback(
        (position: number) =>
            setReorderAnnouncement(t('finalDocument.reorderedToPosition', { position })),
        [t],
    );
    const clearAnnouncement = useCallback(() => setReorderAnnouncement(''), []);
    const reorderSession = useMotionReorderSession({
        sourceOrder: sortableItems,
        onCommit: onReorder,
        onCommitted: announceCommit,
        onStarted: clearAnnouncement,
    });
    const orderedItems = useMemo(
        () => orderListItems(items, reorderSession.order),
        [items, reorderSession.order],
    );
    useSelectedPageScroll(scrollRoot, selectedPageId, selectedPageScrollKey);

    if (items.length === 0) {
        return <EmptyFinalDocument label={t('finalDocument.empty')} />;
    }

    return (
        <div className={listClassName('mx-auto w-full', stackClassName)}>
            <Reorder.Group
                as="div"
                axis="y"
                values={reorderSession.order}
                onReorder={reorderSession.update}
                className={listClassName('flex flex-col', gapClassName)}
            >
                <FinalDocumentRows
                    items={orderedItems}
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
                    activeDragId={reorderSession.activeId}
                    onDragStart={reorderSession.start}
                    onDragEnd={reorderSession.finish}
                    onDragCancel={reorderSession.cancel}
                />
            </Reorder.Group>
            <p className="sr-only" aria-live="polite" aria-atomic="true">
                {reorderAnnouncement}
            </p>
        </div>
    );
}
