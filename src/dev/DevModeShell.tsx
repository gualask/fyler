import type { ReactNode } from 'react';
import { useEffect, useState } from 'react';
import type { DevFixtureContract } from './fixture-contract';

// The dev surface mirrors the real Tauri window: the browser viewport IS the
// window, so a browser or Playwright resize maps 1:1 to the rendered size and
// screenshots stay faithful. The only production rule it replicates is the
// window's minimum size, clamped here and flagged with a warning banner when the
// viewport drops under it.

interface DevModeShellProps {
    minWidth: number;
    minHeight: number;
    contract: DevFixtureContract;
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

export function DevModeShell({ minWidth, minHeight, contract, children }: DevModeShellProps) {
    const below = useViewportBelowMinimum(minWidth, minHeight);
    const [ready, setReady] = useState(false);

    useEffect(() => {
        const root = document.documentElement;
        const prevMinWidth = root.style.minWidth;
        const prevMinHeight = root.style.minHeight;
        const prevFixture = root.dataset.fylerFixture;
        const prevFixtureKind = root.dataset.fylerFixtureKind;
        const prevFixtureReady = root.dataset.fylerFixtureReady;
        root.style.minWidth = `${minWidth}px`;
        root.style.minHeight = `${minHeight}px`;
        root.dataset.fylerFixture = contract.key;
        root.dataset.fylerFixtureKind = contract.kind;
        root.dataset.fylerFixtureReady = 'true';
        window.__FYLER_DEV_FIXTURE__ = contract;
        setReady(true);
        return () => {
            root.style.minWidth = prevMinWidth;
            root.style.minHeight = prevMinHeight;
            if (prevFixture) root.dataset.fylerFixture = prevFixture;
            else delete root.dataset.fylerFixture;
            if (prevFixtureKind) root.dataset.fylerFixtureKind = prevFixtureKind;
            else delete root.dataset.fylerFixtureKind;
            if (prevFixtureReady) root.dataset.fylerFixtureReady = prevFixtureReady;
            else delete root.dataset.fylerFixtureReady;
            delete window.__FYLER_DEV_FIXTURE__;
        };
    }, [contract, minWidth, minHeight]);

    return (
        <div
            className="contents"
            data-fyler-fixture-root={contract.key}
            data-fyler-fixture-kind={contract.kind}
            data-fyler-fixture-ready={ready ? 'true' : 'false'}
        >
            {below ? (
                <div className="fixed inset-x-0 top-0 z-[1000] border-b border-ui-warning-border bg-ui-warning-soft px-4 py-2 text-center text-xs font-semibold text-ui-warning-soft-text shadow-sm">
                    Viewport below the window minimum ({minWidth}x{minHeight}). Layouts at this size
                    are not representative of production.
                </div>
            ) : null}
            {children}
        </div>
    );
}
