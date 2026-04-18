import { type RefObject, useEffect } from 'react';

const FOCUSABLE_SELECTOR = [
    'a[href]',
    'button:not([disabled])',
    'input:not([disabled])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
].join(', ');

function getFocusableElements(container: HTMLElement): HTMLElement[] {
    return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && !element.getAttribute('aria-hidden'),
    );
}

interface Options {
    active?: boolean;
    containerRef: RefObject<HTMLElement | null>;
    onEscape?: () => void;
}

export function useModalFocus({ active = true, containerRef, onEscape }: Options) {
    useEffect(() => {
        if (!active) return;

        const containerEl = containerRef.current;
        if (!(containerEl instanceof HTMLElement)) return;
        const container = containerEl;

        const previousFocus =
            document.activeElement instanceof HTMLElement ? document.activeElement : null;
        const frame = window.requestAnimationFrame(() => {
            const focusables = getFocusableElements(container);
            (focusables[0] ?? container).focus();
        });

        function handleKeyDown(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                onEscape?.();
                return;
            }

            if (event.key !== 'Tab') {
                return;
            }

            const focusables = getFocusableElements(container);
            if (focusables.length === 0) {
                event.preventDefault();
                container.focus();
                return;
            }

            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            const activeElement =
                document.activeElement instanceof HTMLElement ? document.activeElement : null;

            if (event.shiftKey) {
                if (
                    activeElement === first ||
                    !activeElement ||
                    !container.contains(activeElement)
                ) {
                    event.preventDefault();
                    last.focus();
                }
                return;
            }

            if (activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }

        container.addEventListener('keydown', handleKeyDown);

        return () => {
            window.cancelAnimationFrame(frame);
            container.removeEventListener('keydown', handleKeyDown);
            if (previousFocus?.isConnected) {
                previousFocus.focus();
            }
        };
    }, [active, containerRef, onEscape]);
}
