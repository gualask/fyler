import assert from 'node:assert/strict';
import { test } from 'vitest';

import { resources } from '@/shared/i18n/i18n.resources';
import { translate, translatePlural } from '@/shared/i18n/i18n.translate';

import type { AppStatusPayload } from './app-events.types.js';
import { formatImportWarning, formatUserFacingError } from './notification-messages.js';

const t = translate.bind(null, resources.en);
const tp = translatePlural.bind(null, resources.en);

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
            tp,
        ),
        '2 files skipped.',
    );
});

test('uses a generic short import warning for unknown backend reasons', () => {
    const payload = JSON.parse(`{
        "kind": "import-warning",
        "skippedCount": 1,
        "preview": [{ "name": "mystery.bin", "reason": "unexpected_reason" }],
        "hasMore": false
    }`) as AppStatusPayload;

    assert.equal(formatImportWarning(payload, tp), 'File skipped.');
});

test('formats PDF open errors as short toast messages', () => {
    assert.equal(
        formatUserFacingError(
            {
                code: 'open_pdf_failed',
                meta: { name: 'a-very-long-file-name-that-should-not-fill-the-toast.pdf' },
            },
            t,
        ),
        "Couldn't open PDF.",
    );
});

test('maps backend contract errors that previously fell back to unknown', () => {
    assert.equal(
        formatUserFacingError({ code: 'invalid_export_item_kind' }, t),
        'A source has an unexpected file type.',
    );
    assert.equal(
        formatUserFacingError({ code: 'external_url_not_allowed' }, t),
        'This external link is not allowed.',
    );
    assert.equal(
        formatUserFacingError({ code: 'output_path_not_authorized' }, t),
        'Choose the PDF destination again.',
    );
});

test('falls back safely for unknown backend error codes', () => {
    assert.equal(formatUserFacingError({ code: 'future_error_code' }, t), 'Something went wrong.');
});
