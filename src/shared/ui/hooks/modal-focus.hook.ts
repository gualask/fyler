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

function currentFocusedElement() {
    return document.activeElement instanceof HTMLElement ? document.activeElement : null;
}

function focusInitialElement(container: HTMLElement) {
    const focusables = getFocusableElements(container);
    (focusables[0] ?? container).focus();
}

function backwardTabTarget(
    focusables: HTMLElement[],
    activeElement: HTMLElement | null,
    container: HTMLElement,
) {
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    return activeElement === first || !activeElement || !container.contains(activeElement)
        ? last
        : null;
}

function forwardTabTarget(focusables: HTMLElement[], activeElement: HTMLElement | null) {
    const first = focusables[0];
    const last = focusables[focusables.length - 1];
    return activeElement === last ? first : null;
}

function tabFocusTarget(event: KeyboardEvent, container: HTMLElement) {
    const focusables = getFocusableElements(container);
    if (focusables.length === 0) return container;

    const activeElement = currentFocusedElement();
    return event.shiftKey
        ? backwardTabTarget(focusables, activeElement, container)
        : forwardTabTarget(focusables, activeElement);
}

function handleModalKeyDown(
    event: KeyboardEvent,
    container: HTMLElement,
    onEscape: (() => void) | undefined,
) {
    if (event.key === 'Escape') {
        onEscape?.();
        return;
    }

    if (event.key !== 'Tab') return;

    const focusTarget = tabFocusTarget(event, container);
    if (!focusTarget) return;

    event.preventDefault();
    focusTarget.focus();
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

        const previousFocus = currentFocusedElement();
        const frame = window.requestAnimationFrame(() => {
            focusInitialElement(container);
        });

        function handleKeyDown(event: KeyboardEvent) {
            handleModalKeyDown(event, container, onEscape);
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
