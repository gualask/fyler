/// <reference types="node" />

import assert from 'node:assert/strict';
import type { ErrorInfo, ReactNode } from 'react';
import { type AppBoundaryError, AppErrorBoundary } from './AppErrorBoundary.js';

function createBoundary(onError?: (error: AppBoundaryError) => void) {
    return new AppErrorBoundary({
        children: null as ReactNode,
        title: 'Unhandled error',
        reloadLabel: 'Reload',
        onError,
    });
}

{
    const reported: AppBoundaryError[] = [];
    const boundary = createBoundary((error) => {
        reported.push(error);
    });

    boundary.componentDidCatch(new Error('Renderer crashed'), {
        componentStack: '\n    at AppShell\n    at MainAppView',
    } as ErrorInfo);

    assert.deepEqual(reported, [
        {
            message: 'Renderer crashed',
            componentStack: '\n    at AppShell\n    at MainAppView',
        },
    ]);
}

{
    const reported: AppBoundaryError[] = [];
    const boundary = createBoundary((error) => {
        reported.push(error);
    });

    boundary.componentDidCatch('String failure', {
        componentStack: '',
    } as ErrorInfo);

    assert.deepEqual(reported, [
        {
            message: 'String failure',
            componentStack: undefined,
        },
    ]);
}
