import { PagePicker } from '@/features/page-picker';
import type { PagePickerFixtureState } from './page-picker-fixture-state.hook';

export function PagePickerFixturePanel({ fixture }: { fixture: PagePickerFixtureState }) {
    return (
        <PagePicker
            file={fixture.selectedFile}
            finalPages={fixture.finalPages}
            onTogglePage={fixture.togglePage}
            onSetPdfPages={fixture.setPdfPagesForFile}
            onSetImageIncluded={fixture.setImageIncluded}
            onSelectAll={fixture.selectAll}
            onDeselectAll={fixture.deselectAll}
            onFocusTarget={fixture.focusTarget}
            onRotateTarget={fixture.rotateTarget}
            onPreviewTarget={fixture.openPreviewTarget}
            editsByFile={fixture.editsByFile}
            focusedTarget={fixture.focusedTarget}
        />
    );
}
