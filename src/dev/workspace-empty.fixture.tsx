import { WorkspaceFixturePage } from './workspace.fixture';

export function WorkspaceEmptyFixturePage() {
    return <WorkspaceFixturePage createInitialFiles={() => []} />;
}
