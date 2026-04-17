import { useMemo } from 'react';
import { PreviewModal } from '@/features/preview';
import { PdfCacheProvider } from '@/infra/pdf';
import type { FinalPage } from '@/shared/domain';

const DEFAULT_PAGE_COUNT = 3;

function getFixturePageCount(search: string): number {
    const raw = new URLSearchParams(search).get('pages');
    const value = raw ? Number(raw) : DEFAULT_PAGE_COUNT;

    return Number.isInteger(value) && value > 0 ? value : DEFAULT_PAGE_COUNT;
}

function buildFinalPages(total: number): FinalPage[] {
    return Array.from({ length: total }, (_, index) => ({
        id: `preview-fixture-page-${index + 1}`,
        fileId: `missing-preview-source-${index + 1}`,
        kind: 'pdf',
        pageNum: index + 1,
    }));
}

export function PreviewModalFixturePage() {
    const total = getFixturePageCount(window.location.search);
    const finalPages = useMemo(() => buildFinalPages(total), [total]);

    return (
        <PdfCacheProvider>
            <PreviewModal
                finalPages={finalPages}
                files={[]}
                editsByFile={{}}
                imageFit="contain"
                onClose={() => undefined}
            />
        </PdfCacheProvider>
    );
}
