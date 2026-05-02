import type { FinalPage } from '@/shared/domain';
import { toFinalPageId } from '@/shared/domain/utils/final-page-id';
import {
    createSampleEditsByFile,
    createSampleFixtureFiles,
    SAMPLE_IMAGE_FILE,
    SAMPLE_PDF_FILE,
} from './sample-assets.fixture-data';
import { WorkspaceFixturePage } from './workspace.fixture';

function getSelectedId(search: string) {
    return new URLSearchParams(search).get('selected') === 'image'
        ? SAMPLE_IMAGE_FILE.id
        : SAMPLE_PDF_FILE.id;
}

function createWorkspacePreviewFinalPages(): FinalPage[] {
    return [
        {
            id: toFinalPageId(SAMPLE_PDF_FILE.id, { kind: 'pdf', pageNum: 1 }),
            fileId: SAMPLE_PDF_FILE.id,
            kind: 'pdf',
            pageNum: 1,
        },
        {
            id: toFinalPageId(SAMPLE_IMAGE_FILE.id, { kind: 'image' }),
            fileId: SAMPLE_IMAGE_FILE.id,
            kind: 'image',
        },
        {
            id: toFinalPageId(SAMPLE_PDF_FILE.id, { kind: 'pdf', pageNum: 3 }),
            fileId: SAMPLE_PDF_FILE.id,
            kind: 'pdf',
            pageNum: 3,
        },
    ];
}

function createWorkspacePreviewEditsByFile() {
    const edits = createSampleEditsByFile();

    return {
        ...edits,
        [SAMPLE_IMAGE_FILE.id]: {
            ...edits[SAMPLE_IMAGE_FILE.id],
            imageRotation: 0 as const,
        },
    };
}

export function WorkspacePreviewFixturePage() {
    return (
        <WorkspaceFixturePage
            createInitialFiles={createSampleFixtureFiles}
            initialSelectedId={getSelectedId(window.location.search)}
            initialFinalPages={createWorkspacePreviewFinalPages}
            initialEditsByFile={createWorkspacePreviewEditsByFile}
        />
    );
}
