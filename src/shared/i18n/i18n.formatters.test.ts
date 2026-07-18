import assert from 'node:assert/strict';
import { test } from 'vitest';
import { formatImportWarning, formatSkippedFile } from './i18n.formatters.js';
import { resources } from './i18n.resources.js';
import { translate, translatePlural } from './i18n.translate.js';

const t = translate.bind(null, resources.en);
const tp = translatePlural.bind(null, resources.en);

test('maps skipped-file reasons explicitly and falls back for unknown values', () => {
    assert.equal(
        formatSkippedFile({ name: 'clip.mov', reason: 'unsupported_format' }, t),
        'Unsupported file format',
    );
    assert.equal(
        formatSkippedFile({ name: 'mystery.bin', reason: 'unexpected_reason' }, t),
        'Something went wrong.',
    );
});

test('formats unsupported-file import warnings as short toast messages', () => {
    assert.equal(
        formatImportWarning(
            {
                kind: 'import-warning',
                skippedCount: 1,
                preview: [
                    {
                        name: 'very-long-file-name-that-should-not-appear-in-toast.mov',
                        reason: 'unsupported_format',
                    },
                ],
                hasMore: false,
            },
            t,
            tp,
        ),
        'Unsupported file.',
    );

    assert.equal(
        formatImportWarning(
            {
                kind: 'import-warning',
                skippedCount: 3,
                preview: [
                    { name: 'clip.mov', reason: 'unsupported_format' },
                    { name: 'archive.zip', reason: 'unsupported_format' },
                ],
                hasMore: true,
            },
            t,
            tp,
        ),
        '3 unsupported files.',
    );
});

test('uses a generic short import warning for mixed skipped-file reasons', () => {
    assert.equal(
        formatImportWarning(
            {
                kind: 'import-warning',
                skippedCount: 2,
                preview: [
                    { name: 'clip.mov', reason: 'unsupported_format' },
                    { name: 'broken.pdf', reason: 'read_error', detail: 'parse failed' },
                ],
                hasMore: false,
            },
            t,
            tp,
        ),
        '2 files skipped.',
    );
});
