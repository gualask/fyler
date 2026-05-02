import { WorkspaceFixturePage } from './workspace.fixture';
import { createWorkspaceShellFixtureFiles } from './workspace-shell.fixture-data';

export function WorkspaceShellFixturePage() {
    return <WorkspaceFixturePage createInitialFiles={createWorkspaceShellFixtureFiles} />;
}
