/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'vitest';
import { createGlobalErrorHandlers } from './global-error-handlers.js';

test('does not prevent default window errors in development', () => {
    let prevented = false;
    const messages: string[] = [];
    const diagnostics: string[] = [];
    const handlers = createGlobalErrorHandlers({
        isDev: true,
        onError: (message: string) => {
            messages.push(message);
        },
        record: (message: string) => {
            diagnostics.push(message);
        },
    });

    handlers.handleError({
        preventDefault: () => {
            prevented = true;
        },
        error: new Error('Window crash'),
        message: 'Window crash',
    });

    assert.equal(prevented, false);
    assert.deepEqual(messages, ['Window crash']);
    assert.deepEqual(diagnostics, ['Unhandled window error: Window crash']);
});

test('does not prevent default promise rejections in development', () => {
    let prevented = false;
    const messages: string[] = [];
    const diagnostics: string[] = [];
    const handlers = createGlobalErrorHandlers({
        isDev: true,
        onError: (message: string) => {
            messages.push(message);
        },
        record: (message: string) => {
            diagnostics.push(message);
        },
    });

    handlers.handleRejection({
        preventDefault: () => {
            prevented = true;
        },
        reason: new Error('Async dev crash'),
    });

    assert.equal(prevented, false);
    assert.deepEqual(messages, ['Async dev crash']);
    assert.deepEqual(diagnostics, ['Unhandled promise rejection: Async dev crash']);
});

test('prevents default window errors in production', () => {
    let prevented = false;
    const messages: string[] = [];
    const diagnostics: string[] = [];
    const handlers = createGlobalErrorHandlers({
        isDev: false,
        onError: (message: string) => {
            messages.push(message);
        },
        record: (message: string) => {
            diagnostics.push(message);
        },
    });

    handlers.handleError({
        preventDefault: () => {
            prevented = true;
        },
        error: new Error('Window prod crash'),
        message: 'Window prod crash',
    });

    assert.equal(prevented, true);
    assert.deepEqual(messages, ['Window prod crash']);
    assert.deepEqual(diagnostics, ['Unhandled window error: Window prod crash']);
});

test('prevents default promise rejections in production', () => {
    let prevented = false;
    const messages: string[] = [];
    const diagnostics: string[] = [];
    const handlers = createGlobalErrorHandlers({
        isDev: false,
        onError: (message: string) => {
            messages.push(message);
        },
        record: (message: string) => {
            diagnostics.push(message);
        },
    });

    handlers.handleRejection({
        preventDefault: () => {
            prevented = true;
        },
        reason: new Error('Async crash'),
    });

    assert.equal(prevented, true);
    assert.deepEqual(messages, ['Async crash']);
    assert.deepEqual(diagnostics, ['Unhandled promise rejection: Async crash']);
});
