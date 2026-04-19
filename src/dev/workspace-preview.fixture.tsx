import {
    createSampleEditsByFile,
    createSampleFinalPages,
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

export function WorkspacePreviewFixturePage() {
    return (
        <WorkspaceFixturePage
            createInitialFiles={createSampleFixtureFiles}
            initialSelectedId={getSelectedId(window.location.search)}
            initialFinalPages={createSampleFinalPages}
            initialEditsByFile={createSampleEditsByFile}
        />
    );
}
