/// <reference types="node" />

import assert from 'node:assert/strict';
import { toReactBoundaryDiagnostic } from './app-error-diagnostic.js';

assert.deepEqual(
    toReactBoundaryDiagnostic({
        message: 'Renderer crashed',
        componentStack: '\n    at AppShell\n    at MainAppView\n',
    }),
    {
        category: 'app',
        severity: 'error',
        message: 'React error boundary caught an error: Renderer crashed',
        metadata: {
            componentStack: 'AppShell > MainAppView',
        },
    },
);

assert.deepEqual(
    toReactBoundaryDiagnostic({
        message: 'Renderer crashed',
        componentStack: '   ',
    }),
    {
        category: 'app',
        severity: 'error',
        message: 'React error boundary caught an error: Renderer crashed',
    },
);
