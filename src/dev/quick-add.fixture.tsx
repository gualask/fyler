import { QuickAddView } from '@/features/workspace';
import { createWorkspaceShellFixtureFiles } from './workspace-shell.fixture-data';

export function QuickAddFixturePage() {
    const files = createWorkspaceShellFixtureFiles();
    const quickAddFileOrder = files.slice(0, 3).map((file) => file.id);

    return (
        <QuickAddView
            files={files}
            quickAddFileOrder={quickAddFileOrder}
            isTransitioning={false}
            isDragOver={false}
            onRemove={() => undefined}
            onExit={() => undefined}
        />
    );
}
