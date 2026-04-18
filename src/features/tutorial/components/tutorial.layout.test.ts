/// <reference types="node" />

import assert from 'node:assert/strict';

import type { TargetRect } from './tutorial.positioning.ts';
import { getTooltipStyle } from './tutorial.positioning.ts';

function withViewport(width: number, height: number, run: () => void) {
    const previousWindow = globalThis.window;

    Object.defineProperty(globalThis, 'window', {
        value: { innerWidth: width, innerHeight: height },
        configurable: true,
    });

    try {
        run();
    } finally {
        if (previousWindow === undefined) {
            // @ts-expect-error Node tests do not provide a real window object.
            delete globalThis.window;
        } else {
            Object.defineProperty(globalThis, 'window', {
                value: previousWindow,
                configurable: true,
            });
        }
    }
}

withViewport(1100, 600, () => {
    const leftEdgeRect: TargetRect = { top: 186, left: 8, width: 580, height: 114 };
    const leftEdgeStyle = getTooltipStyle(leftEdgeRect);

    assert.equal(
        leftEdgeStyle.left,
        24,
        'Tutorial cards should keep a left gutter instead of touching the window edge.',
    );

    const rightEdgeRect: TargetRect = { top: 186, left: 900, width: 150, height: 114 };
    const rightEdgeStyle = getTooltipStyle(rightEdgeRect);

    assert.equal(
        rightEdgeStyle.left,
        756,
        'Tutorial cards should also preserve the same gutter on the right edge.',
    );
});
