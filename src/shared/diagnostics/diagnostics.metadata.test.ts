/// <reference types="node" />

import assert from 'node:assert/strict';
import {
    formatDiagnosticMetadataInline,
    getDiagnosticMetadataEntries,
} from './diagnostics.metadata.js';

assert.deepEqual(getDiagnosticMetadataEntries({ warningCount: 2, hasMore: false }), [
    ['warningCount', '2'],
    ['hasMore', 'false'],
]);

assert.equal(
    formatDiagnosticMetadataInline({ warningCount: 2, hasMore: false }),
    ' (warningCount=2, hasMore=false)',
);
