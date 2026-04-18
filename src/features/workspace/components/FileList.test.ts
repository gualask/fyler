/// <reference types="node" />

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./FileList.tsx', import.meta.url), 'utf8');

assert.doesNotMatch(
    source,
    /className="section-header file-list-header relative z-20"/,
    'The file list header must stay below the empty-state overlay when the workspace is empty.',
);
