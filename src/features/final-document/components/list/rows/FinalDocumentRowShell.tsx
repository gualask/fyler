import { IconGripVertical, IconX } from '@tabler/icons-react';
import { Reorder, useDragControls } from 'motion/react';
import type { KeyboardEvent, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';

import { useTranslation } from '@/shared/i18n';
import { FocusFlashOverlay } from '@/shared/ui/feedback/FocusFlashOverlay';
import type { ListItem } from '../list-item.types';
import { ListRowIndexControls } from './ListRowIndexControls';

type DragHandleContextValue = {
    isDragging: boolean;
    start: (event: ReactPointerEvent<HTMLButtonElement>) => void;
    cancel: () => void;
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

    const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
        if (event.key !== 'Escape' || !dragHandle.isDragging) return;
        event.preventDefault();
        dragHandle.cancel();
    };

    return (
        <button
            type="button"
            onPointerDown={(event) => {
                event.stopPropagation();
                dragHandle.start(event);
            }}
            onKeyDown={handleKeyDown}
            onClick={(e) => e.stopPropagation()}
            className={`${className} touch-none select-none`}
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
    isDragging: boolean;
    onDragStart: () => void;
    onDragEnd: () => void;
    onDragCancel: () => void;
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
    isDragging,
    onDragStart,
    onDragEnd,
    onDragCancel,
}: Props) {
    const { t } = useTranslation();
    const dragControls = useDragControls();
    const startDrag = useCallback(
        (event: ReactPointerEvent<HTMLButtonElement>) => {
            dragControls.start(event, { distanceThreshold: 6 });
        },
        [dragControls],
    );
    const cancelDrag = useCallback(() => {
        dragControls.cancel();
        onDragCancel();
    }, [dragControls, onDragCancel]);
    const dragHandle = useMemo<DragHandleContextValue>(
        () => ({ isDragging, start: startDrag, cancel: cancelDrag }),
        [cancelDrag, isDragging, startDrag],
    );

    return (
        <Reorder.Item
            as="div"
            value={item.page.id}
            dragListener={false}
            dragControls={dragControls}
            dragMomentum={false}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
            data-final-page-id={item.page.id}
            className="relative flex min-w-0 items-stretch gap-4"
            whileDrag={{ opacity: 0.55 }}
            transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
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
                {item.isSelected && flashKey ? (
                    <FocusFlashOverlay flashKey={flashKey} className={flashOverlayClassName} />
                ) : null}

                <FinalDocumentDragHandleContext.Provider value={dragHandle}>
                    {!hideDefaultDragHandle ? (
                        <FinalDocumentDragHandle className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md cursor-grab text-ui-text-muted transition-colors hover:bg-ui-surface-hover hover:text-ui-text active:cursor-grabbing" />
                    ) : null}

                    {children}
                </FinalDocumentDragHandleContext.Provider>

                <button
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item.page.id);
                    }}
                    className="btn-icon absolute right-2 top-2 h-7 w-7 rounded-md bg-ui-surface shadow-sm opacity-0 scale-95 pointer-events-none transition-[opacity,transform,color,background-color,box-shadow] hover:bg-ui-surface-hover hover:text-ui-danger group-hover:pointer-events-auto group-hover:opacity-100 group-hover:scale-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100 group-focus-within:scale-100"
                    aria-label={t('finalDocument.removePage')}
                    title={t('finalDocument.removePage')}
                >
                    <IconX className="h-3.5 w-3.5" />
                </button>
            </div>
        </Reorder.Item>
    );
}
