import { PreviewModal } from '@/features/preview';
import type { PagePickerFixtureState } from './page-picker-fixture-state.hook';

export function PagePickerFixturePreview({ fixture }: { fixture: PagePickerFixtureState }) {
    const previewTarget = fixture.previewTarget;

    if (!previewTarget) {
        return null;
    }

    return (
        <PreviewModal
            key={previewTarget.page.id}
            finalPages={[previewTarget.page]}
            files={[previewTarget.file]}
            editsByFile={fixture.editsByFile}
            imageFit="contain"
            matchExportedImages
            indicator={{
                total: previewTarget.file.kind === 'pdf' ? (previewTarget.file.pageCount ?? 1) : 1,
                mode: 'page-num',
            }}
            onRotatePage={fixture.rotateTarget}
            onClose={fixture.closePreview}
        />
    );
}
