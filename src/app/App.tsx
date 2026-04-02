import { AppProviders } from '@/app/providers';

import { AppShell } from './AppShell';

function App() {
    return (
        <AppProviders>
            <AppShell />
        </AppProviders>
    );
}

export default App;
