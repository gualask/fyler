import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';

// The dev surface mirrors the real Tauri window: the browser viewport IS the
// window, so a browser or Playwright resize maps 1:1 to the rendered size and
// screenshots stay faithful. The only production rule it replicates is the
// window's minimum size, clamped here and flagged with a warning banner when the
// viewport drops under it. The minimum is per-fixture because Quick Add runs in a
// compact window while every other surface uses the normal window minimum.

interface DevModeShellProps {
    minWidth: number;
    minHeight: number;
    children: ReactNode;
}

function useViewportBelowMinimum(minWidth: number, minHeight: number): boolean {
    const [below, setBelow] = useState(() =>
        typeof window !== 'undefined'
            ? window.innerWidth < minWidth || window.innerHeight < minHeight
            : false,
    );

    useEffect(() => {
        const onResize = () => {
            setBelow(window.innerWidth < minWidth || window.innerHeight < minHeight);
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, [minWidth, minHeight]);

    return below;
}

export function DevModeShell({ minWidth, minHeight, children }: DevModeShellProps) {
    const below = useViewportBelowMinimum(minWidth, minHeight);

    useEffect(() => {
        const root = document.documentElement;
        const prevMinWidth = root.style.minWidth;
        const prevMinHeight = root.style.minHeight;
        root.style.minWidth = `${minWidth}px`;
        root.style.minHeight = `${minHeight}px`;
        return () => {
            root.style.minWidth = prevMinWidth;
            root.style.minHeight = prevMinHeight;
        };
    }, [minWidth, minHeight]);

    return (
        <>
            {below ? (
                <div className="fixed inset-x-0 top-0 z-[1000] border-b border-ui-warning-border bg-ui-warning-soft px-4 py-2 text-center text-xs font-semibold text-ui-warning-soft-text shadow-sm">
                    Viewport below the window minimum ({minWidth}x{minHeight}). Layouts at this size
                    are not representative of production.
                </div>
            ) : null}
            {children}
        </>
    );
}
