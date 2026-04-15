/// <reference types="node" />

import assert from 'node:assert/strict';
import { createGlobalErrorHandlers } from './global-error-handlers.js';

{
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
}

{
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
}

{
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
}

{
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
}
