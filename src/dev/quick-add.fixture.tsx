import { QuickAddView } from '@/features/workspace';
import { createWorkspaceShellFixtureFiles } from './workspace-shell.fixture-data';

export function QuickAddFixturePage() {
    const files = createWorkspaceShellFixtureFiles();
    const quickAddFileIds = new Set(files.slice(0, 3).map((file) => file.id));

    return (
        <QuickAddView
            files={files}
            quickAddFileIds={quickAddFileIds}
            isDragOver={false}
            onRemove={() => undefined}
            onExit={() => undefined}
        />
    );
}
