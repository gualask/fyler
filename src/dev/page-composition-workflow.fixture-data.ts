import type { SourceFile } from '@/capabilities/document-sources';
import type { CompositionLayout, PageComposition } from '@/modules/page-composition/model';

export const FRONT_FILE: SourceFile = {
    id: 'fixture-composition-front',
    originalPath: '/fixtures/sample-image.jpg',
    name: 'document-front.jpg',
    byteSize: 53_932,
    pageCount: 1,
    kind: 'image',
};

export const BACK_FILE: SourceFile = {
    id: 'fixture-composition-back',
    originalPath: '/fixtures/hero.png',
    name: 'document-back.png',
    byteSize: 1_322_899,
    pageCount: 1,
    kind: 'image',
};

export function initialComposition(search: string): PageComposition {
    const params = new URLSearchParams(search);
    const layout: CompositionLayout =
        params.get('layout') === 'horizontal' ? 'a4-side-by-side-halves' : 'a4-stacked-halves';
    const empty = params.get('state') === 'empty';

    return {
        layout,
        regions: {
            top: {
                source: empty ? null : { kind: 'image', file: FRONT_FILE },
                rotation: 0,
            },
            bottom: {
                source: empty ? null : { kind: 'image', file: BACK_FILE },
                rotation: 0,
            },
        },
    };
}
