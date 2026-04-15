/// <reference types="node" />

import assert from 'node:assert/strict';
import { classifyAddFilesResult } from './add-files-action-result.js';

assert.deepEqual(classifyAddFilesResult({ addedCount: 2, skippedCount: 0 }), {
    diagnosticSeverity: 'info',
    diagnosticMessage: 'Files added to workspace',
    metadata: { addedCount: 2, skippedCount: 0 },
});

assert.deepEqual(classifyAddFilesResult({ addedCount: 0, skippedCount: 0 }), {
    diagnosticSeverity: 'info',
    diagnosticMessage: 'Open files dialog canceled',
    metadata: { addedCount: 0, skippedCount: 0 },
});

assert.deepEqual(classifyAddFilesResult({ addedCount: 0, skippedCount: 3 }), {
    diagnosticSeverity: 'warn',
    diagnosticMessage: 'Open files completed with skipped files',
    metadata: { addedCount: 0, skippedCount: 3 },
});
