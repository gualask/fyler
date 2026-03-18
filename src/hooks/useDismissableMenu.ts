import { useEffect, type RefObject } from 'react';

interface Options {
    open: boolean;
    rootRef: RefObject<HTMLElement | null>;
    onClose: () => void;
}

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
