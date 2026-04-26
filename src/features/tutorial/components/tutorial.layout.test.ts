/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'vitest';

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

test('keeps tutorial cards inside viewport gutters', () => {
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
});

test('keeps tutorial cards inside the viewport at the app minimum size', () => {
    withViewport(1100, 600, () => {
        const outputFooterRect: TargetRect = {
            top: 546,
            left: 670,
            width: 418,
            height: 42,
        };
        const outputFooterStyle = getTooltipStyle(outputFooterRect, 1100, 600, {
            width: 320,
            height: 146,
        });

        assert.equal(outputFooterStyle.top, 388);
        assert.equal(outputFooterStyle.left, 670);

        const belowViewportRect: TargetRect = {
            top: 684,
            left: 670,
            width: 418,
            height: 42,
        };
        const belowViewportStyle = getTooltipStyle(belowViewportRect, 1100, 600, {
            width: 320,
            height: 146,
        });

        assert.equal(
            belowViewportStyle.top,
            430,
            'Tutorial cards should clamp back into view when the target is below the viewport.',
        );
    });
});
