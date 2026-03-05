import { useCallback, useRef } from 'react';

export interface DragHandlers {
    onDragStart: (id: string) => void;
    onDragOver: (e: React.DragEvent) => void;
    onDrop: (id: string) => void;
}

/** Handles HTML5 drag-and-drop reordering via a reorderDocs callback. */
export function useDragDrop(reorderDocs: (fromId: string, toId: string) => void) {
    const draggedId = useRef<string | null>(null);

    const handleDragStart = useCallback((id: string) => {
        draggedId.current = id;
    }, []);

    const handleDragOver = useCallback(() => {
        // preventDefault già fatto in DocumentRow
    }, []);

    const handleDrop = useCallback(
        (targetId: string) => {
            const fromId = draggedId.current;
            if (!fromId || fromId === targetId) return;
            reorderDocs(fromId, targetId);
            draggedId.current = null;
        },
        [reorderDocs],
    );

    const dragHandlers: DragHandlers = { onDragStart: handleDragStart, onDragOver: handleDragOver, onDrop: handleDrop };
    return dragHandlers;
}
