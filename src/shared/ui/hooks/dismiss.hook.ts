import { type RefObject, useEffect } from 'react';

/**
 * Dismisses an open UI surface when the user clicks outside `containerRef` or presses `Escape`.
 *
 * This hook attaches global listeners only while `active` is true.
 */
export function useDismiss(
    active: boolean,
    containerRef: RefObject<HTMLElement | null>,
    onDismiss: () => void,
) {
    useEffect(() => {
        if (!active) return;

        const handleMouseDown = (event: MouseEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) {
                onDismiss();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') onDismiss();
        };

        window.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [active, containerRef, onDismiss]);
}
