import assert from 'node:assert/strict';
import { describe, test } from 'vitest';

import { currentSummary } from '@/modules/batch-compression/model';
import { initialBatchState } from './batch-compression-workflow.fixture-data';
import { initialComposition } from './page-composition-workflow.fixture-data';

describe('LLM workflow fixtures', () => {
    test('builds populated, empty, and horizontal front/back scenarios', () => {
        const populated = initialComposition('?dev=workflow-front-back');
        const empty = initialComposition('?dev=workflow-front-back&state=empty');
        const horizontal = initialComposition('?dev=workflow-front-back&layout=horizontal');

        assert.ok(populated.regions.top.source);
        assert.ok(populated.regions.bottom.source);
        assert.equal(empty.regions.top.source, null);
        assert.equal(empty.regions.bottom.source, null);
        assert.equal(horizontal.layout, 'a4-side-by-side-halves');
    });

    test('builds deterministic batch lifecycle scenarios', () => {
        const ready = initialBatchState('?state=ready');
        const running = initialBatchState('?state=running');
        const completed = initialBatchState('?state=completed');
        const issues = initialBatchState('?state=issues');
        const empty = initialBatchState('?state=empty');

        assert.deepEqual(
            ready.sources.map((source) => source.state),
            ['ready', 'ready', 'ready', 'ready'],
        );
        assert.equal(running.isRunning, true);
        assert.deepEqual(running.runProgress, { completed: 2, total: 4 });
        assert.deepEqual(currentSummary(completed), {
            compressed: 3,
            alreadyOptimized: 1,
            skipped: 0,
            failed: 0,
            originalBytes: 6_231_257,
            outputBytes: 3_636_781,
        });
        assert.equal(currentSummary(issues).skipped, 1);
        assert.equal(currentSummary(issues).failed, 1);
        assert.equal(empty.sources.length, 0);
    });
});
