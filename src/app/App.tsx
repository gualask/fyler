import { AppProviders } from '@/app/providers';
import { DevModePage } from '@/dev';
import { getDevFixtureKey } from '@/dev/dev-mode';

import { AppShell } from './AppShell';

function App() {
    if (getDevFixtureKey(window.location.search)) {
        return <DevModePage />;
    }

    return (
        <AppProviders>
            <AppShell />
        </AppProviders>
    );
}

export default App;
