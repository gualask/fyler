import { useMemo } from 'react';
import { PdfCacheProvider } from '@/infrastructure/pdfjs';
import type { FinalPage } from '@/modules/merge/model';
import { PreviewModal } from '@/modules/merge/ui/preview';
import { SAMPLE_PDF_FILE } from './sample-assets.fixture-data';

const DEFAULT_PAGE_COUNT = 3;
const MAX_SAMPLE_PAGES = SAMPLE_PDF_FILE.pageCount ?? DEFAULT_PAGE_COUNT;

function getFixturePageCount(search: string): number {
    const raw = new URLSearchParams(search).get('pages');
    const value = raw ? Number(raw) : DEFAULT_PAGE_COUNT;

    if (!Number.isInteger(value) || value <= 0) {
        return DEFAULT_PAGE_COUNT;
    }

    return Math.min(value, MAX_SAMPLE_PAGES);
}

function buildFinalPages(total: number): FinalPage[] {
    return Array.from({ length: total }, (_, index) => ({
        id: `preview-fixture-page-${index + 1}`,
        fileId: SAMPLE_PDF_FILE.id,
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
                files={[SAMPLE_PDF_FILE]}
                editsByFile={{}}
                imageFit="contain"
                onClose={() => undefined}
            />
        </PdfCacheProvider>
    );
}
