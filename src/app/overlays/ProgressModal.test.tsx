/// <reference types="node" />

import assert from 'node:assert/strict';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, test, vi } from 'vitest';
import { ProgressModal } from './ProgressModal';
import {
    createProgressModalTimingController,
    PROGRESS_MODAL_MIN_VISIBLE_MS,
    PROGRESS_MODAL_SHOW_DELAY_MS,
} from './progress-modal-timing';

afterEach(() => vi.useRealTimers());

function createTimingHarness() {
    const onProcessingStarted = vi.fn();
    const onShow = vi.fn();
    const onHide = vi.fn();
    const controller = createProgressModalTimingController(
        { onProcessingStarted, onShow, onHide },
        {
            now: () => Date.now(),
            setTimeout: (callback, delayMs) => setTimeout(callback, delayMs),
            clearTimeout: (timeoutId) => clearTimeout(timeoutId),
        },
    );

    return { controller, onProcessingStarted, onShow, onHide };
}

test('renders file count progress without a focus outline', () => {
    const markup = renderToStaticMarkup(
        createElement(ProgressModal, {
            message: 'Loading files',
            progress: 43,
            progressLabel: '3 of 7',
        }),
    );

    assert.match(markup, /role="progressbar"/);
    assert.match(markup, /aria-valuenow="43"/);
    assert.match(markup, />3 of 7</);
    assert.match(markup, /outline-none/);
    assert.doesNotMatch(markup, /animate-spin/);
});

test('uses the compact full-window treatment for Quick Add', () => {
    const markup = renderToStaticMarkup(
        createElement(ProgressModal, {
            message: 'Loading files',
            variant: 'compact',
        }),
    );

    assert.match(markup, /progress-backdrop-compact/);
    assert.match(markup, /max-w-xs/);
    assert.doesNotMatch(markup, /dialog-panel flex/);
    assert.doesNotMatch(markup, /aria-valuenow=/);
});

test('separates elapsed time from the file-count progress', () => {
    const markup = renderToStaticMarkup(
        createElement(ProgressModal, {
            message: 'Loading files',
            progress: 0,
            progressLabel: '0 of 1',
            elapsedTimeLabel: 'Elapsed time',
        }),
    );

    assert.match(markup, /0 of 1/);
    assert.match(markup, /Elapsed time:.*0 s/);
    assert.match(markup, /role="timer"/);
    assert.match(markup, /aria-live="off"/);
    assert.ok(markup.indexOf('role="timer"') > markup.indexOf('role="progressbar"'));
});

test('keeps elapsed time anchored to processing start when presentation is delayed', () => {
    const markup = renderToStaticMarkup(
        createElement(ProgressModal, {
            message: 'Loading files',
            progress: 50,
            progressLabel: '1 of 2',
            elapsedTimeLabel: 'Elapsed time',
            elapsedStartedAt: performance.now() - 2100,
        }),
    );

    assert.match(markup, /Elapsed time:.*2 s/);
});

test('does not show the progress modal when processing finishes inside the delay', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { controller, onProcessingStarted, onShow, onHide } = createTimingHarness();

    controller.setActive(true);
    vi.advanceTimersByTime(PROGRESS_MODAL_SHOW_DELAY_MS - 1);
    controller.setActive(false);
    vi.advanceTimersByTime(PROGRESS_MODAL_SHOW_DELAY_MS);

    assert.deepEqual(onProcessingStarted.mock.calls, [[0]]);
    assert.equal(onShow.mock.calls.length, 0);
    assert.equal(onHide.mock.calls.length, 1);
});

test('keeps a shown progress modal visible for the configured minimum', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { controller, onShow, onHide } = createTimingHarness();

    controller.setActive(true);
    vi.advanceTimersByTime(PROGRESS_MODAL_SHOW_DELAY_MS);
    vi.advanceTimersByTime(100);
    controller.setActive(false);
    vi.advanceTimersByTime(PROGRESS_MODAL_MIN_VISIBLE_MS - 101);

    assert.equal(onShow.mock.calls.length, 1);
    assert.equal(onHide.mock.calls.length, 0);

    vi.advanceTimersByTime(1);
    assert.equal(onHide.mock.calls.length, 1);
});

test('cancels a pending hide when a new operation starts', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { controller, onProcessingStarted, onShow, onHide } = createTimingHarness();

    controller.setActive(true);
    vi.advanceTimersByTime(PROGRESS_MODAL_SHOW_DELAY_MS + 50);
    controller.setActive(false);
    vi.advanceTimersByTime(50);
    controller.setActive(true);
    vi.advanceTimersByTime(PROGRESS_MODAL_MIN_VISIBLE_MS);

    assert.equal(onShow.mock.calls.length, 1);
    assert.equal(onHide.mock.calls.length, 0);
    assert.deepEqual(onProcessingStarted.mock.calls, [[0], [PROGRESS_MODAL_SHOW_DELAY_MS + 100]]);
});

test('cancels pending presentation work when the controller is disposed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(0);
    const { controller, onShow, onHide } = createTimingHarness();

    controller.setActive(true);
    controller.dispose();
    vi.advanceTimersByTime(PROGRESS_MODAL_SHOW_DELAY_MS);

    assert.equal(onShow.mock.calls.length, 0);
    assert.equal(onHide.mock.calls.length, 0);
});
