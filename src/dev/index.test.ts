/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./index.tsx', import.meta.url), 'utf8');

assert.match(
    source,
    /['"]error-boundary['"]/,
    'Dev fixtures should register an error-boundary route for the AppErrorBoundary fallback.',
);

assert.match(
    source,
    /if \(fixtureKey === 'error-boundary'\) \{[\s\S]*?return <ErrorBoundaryFixturePage \/>;/,
    'Dev mode should mount the dedicated error-boundary fixture page.',
);
