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
