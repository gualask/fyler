import type { DraggableSyntheticListeners } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { IconGripVertical, IconX } from '@tabler/icons-react';
import type { CSSProperties, ReactNode } from 'react';
import { createContext, useContext } from 'react';

import { useTranslation } from '@/shared/i18n';
import { FocusFlashOverlay } from '@/shared/ui/feedback/FocusFlashOverlay';
import type { ListItem } from '../list-item.types';
import { ListRowIndexControls } from './ListRowIndexControls';

type DragHandleContextValue = {
    listeners: DraggableSyntheticListeners;
    setActivatorNodeRef: (element: HTMLElement | null) => void;
};

const FinalDocumentDragHandleContext = createContext<DragHandleContextValue | null>(null);

function useFinalDocumentDragHandle(): DragHandleContextValue | null {
    return useContext(FinalDocumentDragHandleContext);
}

export function FinalDocumentDragHandle({
    className,
    iconClassName = 'h-5 w-5',
}: {
    className: string;
    iconClassName?: string;
}) {
    const { t } = useTranslation();
    const dragHandle = useFinalDocumentDragHandle();
    if (!dragHandle) return null;

    return (
        <button
            type="button"
            ref={dragHandle.setActivatorNodeRef}
            {...dragHandle.listeners}
            onClick={(e) => e.stopPropagation()}
            className={className}
            aria-label={t('finalDocument.dragHandle')}
            title={t('finalDocument.dragHandle')}
        >
            <IconGripVertical className={iconClassName} />
        </button>
    );
}

interface Props {
    item: ListItem;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onRemove: (id: string) => void;
    onSelect: () => void;
    flashKey?: number;
    flashOverlayClassName: string;
    cardClassName: string;
    hideDefaultDragHandle?: boolean;
    indexControlsSize?: 'sm' | 'lg';
    children: ReactNode;
    onMoveTo?: (targetIndex: number) => void;
    totalItems?: number;
}

export function FinalDocumentRowShell({
    item,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
    onRemove,
    onSelect,
    flashKey,
    flashOverlayClassName,
    cardClassName,
    hideDefaultDragHandle = false,
    indexControlsSize = 'sm',
    children,
    onMoveTo,
    totalItems,
}: Props) {
    const { t } = useTranslation();
    const {
        attributes,
        listeners,
        setActivatorNodeRef,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({
        id: item.page.id,
    });

    const style: CSSProperties = {
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 10 : undefined,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            data-final-page-id={item.page.id}
            {...attributes}
            className={['flex min-w-0 items-center gap-3', isDragging ? 'opacity-50' : ''].join(
                ' ',
            )}
        >
            <ListRowIndexControls
                indexLabel={item.index + 1}
                isFirst={isFirst}
                isLast={isLast}
                onMoveUp={onMoveUp}
                onMoveDown={onMoveDown}
                size={indexControlsSize}
                onMoveToIndex={onMoveTo}
                totalItems={totalItems}
            />

            <div onClick={onSelect} className={cardClassName}>
                {item.isSelected && flashKey && (
                    <FocusFlashOverlay flashKey={flashKey} className={flashOverlayClassName} />
                )}

                <FinalDocumentDragHandleContext.Provider value={{ listeners, setActivatorNodeRef }}>
                    {!hideDefaultDragHandle ? (
                        <FinalDocumentDragHandle className="shrink-0 cursor-grab text-ui-text-muted active:cursor-grabbing" />
                    ) : null}

                    {children}
                </FinalDocumentDragHandleContext.Provider>

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.page.id);
                    }}
                    className="absolute -right-2 -top-2 hidden h-6 w-6 items-center justify-center rounded-full bg-ui-danger text-white shadow-md transition-colors hover:bg-ui-danger-hover group-hover:flex"
                    title={t('finalDocument.removePage')}
                >
                    <IconX className="h-3.5 w-3.5" />
                </button>
            </div>
        </div>
    );
}
