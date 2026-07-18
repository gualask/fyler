import assert from 'node:assert/strict';
import { test } from 'vitest';
import { resources } from '@/shared/i18n/i18n.resources';
import { translate } from '@/shared/i18n/i18n.translate';
import { formatUserFacingError } from './user-facing.js';

const t = translate.bind(null, resources.en);

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
