import { PdfCacheProvider } from '@/infra/pdf';
import { PagePickerFixtureLayout } from './page-picker-fixture/page-picker-fixture-layout';
import { PagePickerFixturePanel } from './page-picker-fixture/page-picker-fixture-panel';
import { PagePickerFixturePreview } from './page-picker-fixture/page-picker-fixture-preview';
import { usePagePickerFixtureState } from './page-picker-fixture/page-picker-fixture-state.hook';

export function PagePickerFixturePage() {
    const fixture = usePagePickerFixtureState(window.location.search);

    return (
        <PdfCacheProvider>
            <PagePickerFixtureLayout>
                <PagePickerFixturePanel fixture={fixture} />
            </PagePickerFixtureLayout>
            <PagePickerFixturePreview fixture={fixture} />
        </PdfCacheProvider>
    );
}
