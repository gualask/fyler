import { type RefObject, useEffect } from 'react';

interface Options {
    open: boolean;
    rootRef: RefObject<HTMLElement | null>;
    onClose: () => void;
}

/**
 * Closes a menu/popover when the user clicks outside `rootRef` or presses `Escape`.
 *
 * Unlike `useDismiss`, this hook is specialized for menu-like components and uses the `open` flag.
 */
export function useDismissableMenu({ open, rootRef, onClose }: Options) {
    useEffect(() => {
        if (!open) {
            return;
        }

        function handlePointerDown(event: MouseEvent) {
            if (!rootRef.current?.contains(event.target as Node)) {
                onClose();
            }
        }

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onClose();
            }
        }

        window.addEventListener('mousedown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('mousedown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [onClose, open, rootRef]);
}
