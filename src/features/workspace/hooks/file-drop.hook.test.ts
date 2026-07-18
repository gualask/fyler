import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { OpenFilesResult } from '@/shared/domain';
import { createDroppedFileImportRunner } from './file-drop.hook';

const EMPTY_RESULT: OpenFilesResult = {
    files: [],
    passwordRequired: [],
    skippedErrors: [],
};

test('ignores a repeated drop while the first import is running', async () => {
    let resolveOpen: ((result: OpenFilesResult) => void) | undefined;
    let beginCount = 0;
    let finishCount = 0;
    const firstOpen = new Promise<OpenFilesResult>((resolve) => {
        resolveOpen = resolve;
    });
    const runner = createDroppedFileImportRunner({
        openFiles: () => firstOpen,
        addFiles: () => [],
        onError: () => undefined,
        beginImport: () => {
            beginCount += 1;
            return true;
        },
        finishImport: () => {
            finishCount += 1;
        },
        isActive: () => true,
    });

    const firstDrop = runner(['/tmp/first.pdf']);
    const repeatedDropAccepted = await runner(['/tmp/first.pdf']);

    assert.equal(repeatedDropAccepted, false);
    assert.equal(beginCount, 1);
    assert.equal(finishCount, 0);

    resolveOpen?.(EMPTY_RESULT);
    assert.equal(await firstDrop, true);
    assert.equal(finishCount, 1);
});

test('does not start a drop import when another loading operation owns the UI', async () => {
    let openCount = 0;
    const runner = createDroppedFileImportRunner({
        openFiles: async () => {
            openCount += 1;
            return EMPTY_RESULT;
        },
        addFiles: () => [],
        onError: () => undefined,
        beginImport: () => false,
        finishImport: () => undefined,
        isActive: () => true,
    });

    assert.equal(await runner(['/tmp/file.pdf']), false);
    assert.equal(openCount, 0);
});
