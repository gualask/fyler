/// <reference types="node" />

import assert from 'node:assert/strict';
import { test } from 'vitest';
import {
    formatDiagnosticMetadataInline,
    getDiagnosticMetadataEntries,
} from './diagnostics.metadata.js';

test('formats diagnostic metadata for inline output', () => {
    assert.deepEqual(getDiagnosticMetadataEntries({ warningCount: 2, hasMore: false }), [
        ['warningCount', '2'],
        ['hasMore', 'false'],
    ]);

    assert.equal(
        formatDiagnosticMetadataInline({ warningCount: 2, hasMore: false }),
        ' (warningCount=2, hasMore=false)',
    );
});
