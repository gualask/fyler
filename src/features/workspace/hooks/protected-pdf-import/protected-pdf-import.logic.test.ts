import assert from 'node:assert/strict';
import { test } from 'vitest';
import type { PasswordProtectedFile, SourceFile } from '@/shared/domain';
import {
    currentPasswordImport,
    type PendingPasswordImport,
    passwordDialogError,
    passwordSubmissionFromDialog,
    resolvedImportFiles,
    skipCurrentPasswordFile,
    unlockRemainingWithPassword,
} from './protected-pdf-import.logic';

function sourceFile(id: string): SourceFile {
    return {
        id,
        originalPath: `/tmp/${id}.pdf`,
        name: `${id}.pdf`,
        byteSize: 100,
        pageCount: 1,
        kind: 'pdf',
    };
}

function protectedFile(name: string): PasswordProtectedFile {
    return {
        originalPath: `/tmp/${name}.pdf`,
        name: `${name}.pdf`,
        byteSize: 100,
    };
}

function pendingPasswordImport({
    baseFiles = [sourceFile('base')],
    queue = [protectedFile('locked-a'), protectedFile('locked-b')],
    unlockedFiles = [],
    completedCount = 0,
}: Partial<PendingPasswordImport> = {}): PendingPasswordImport {
    return {
        baseFiles,
        queue,
        unlockedFiles,
        completedCount,
        resolve: () => undefined,
    };
}

test('builds a password submission for the current protected file', () => {
    const pending = pendingPasswordImport();
    const activeImport = currentPasswordImport(pending);

    assert.ok(activeImport);
    assert.equal(activeImport.current.name, 'locked-a.pdf');

    assert.deepEqual(passwordSubmissionFromDialog(activeImport, 'secret', true), {
        pending,
        current: protectedFile('locked-a'),
        password: 'secret',
        tryForRemaining: true,
    });
    assert.equal(passwordSubmissionFromDialog(activeImport, '', true), null);
});

test('skips the current protected file and resolves imported files in order', () => {
    const pending = pendingPasswordImport({
        unlockedFiles: [sourceFile('unlocked-a')],
        completedCount: 1,
    });

    skipCurrentPasswordFile(pending);

    assert.equal(pending.completedCount, 2);
    assert.deepEqual(
        pending.queue.map((file) => file.name),
        ['locked-b.pdf'],
    );
    assert.deepEqual(
        resolvedImportFiles(pending).map((file) => file.id),
        ['base', 'unlocked-a'],
    );
});

test('unlocks remaining protected files with a reused password and keeps failures queued', async () => {
    const pending = pendingPasswordImport({ queue: [protectedFile('locked-a')] });
    const remaining = [protectedFile('locked-b'), protectedFile('locked-c')];
    const diagnostics: string[] = [];

    const stillLocked = await unlockRemainingWithPassword(
        pending,
        remaining,
        'secret',
        async (file) => {
            if (file.name === 'locked-c.pdf') {
                throw JSON.stringify({ code: 'invalid_pdf_password' });
            }

            return sourceFile(file.name.replace('.pdf', ''));
        },
        (entry) => {
            diagnostics.push(`${entry.severity}:${entry.metadata?.name}`);
        },
    );

    assert.deepEqual(
        pending.unlockedFiles.map((file) => file.id),
        ['locked-b'],
    );
    assert.deepEqual(
        stillLocked.map((file) => file.name),
        ['locked-c.pdf'],
    );
    assert.deepEqual(diagnostics, ['warn:locked-c.pdf']);
});

test('classifies invalid password payloads separately from generic unlock failures', () => {
    assert.equal(
        passwordDialogError(JSON.stringify({ code: 'invalid_pdf_password' })),
        'invalid-password',
    );
    assert.equal(passwordDialogError(new Error('native bridge failed')), 'unlock-failed');
});
