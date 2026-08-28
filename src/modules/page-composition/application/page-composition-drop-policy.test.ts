import { describe, expect, test } from 'vitest';

import { limitCompositionDropPaths } from './page-composition-drop-policy';

describe('limitCompositionDropPaths', () => {
    test('keeps only the first dropped file before import', () => {
        expect(
            limitCompositionDropPaths(['/tmp/front.pdf', '/tmp/back.pdf', '/tmp/extra.jpg']),
        ).toEqual(['/tmp/front.pdf']);
    });

    test('keeps an empty drop empty', () => {
        expect(limitCompositionDropPaths([])).toEqual([]);
    });
});
