import { AppProviders } from '@/app/providers';

import { DEV_FIXTURE_INDEX_KEY, getDevFixtureHref, getDevFixtureKey } from './dev-mode';
import { WorkspaceEmptyFixturePage } from './workspace-empty.fixture';
import { WorkspaceShellFixturePage } from './workspace-shell.fixture';

const FIXTURE_KEYS = ['workspace-shell', 'workspace-empty'] as const;

function DevIndexPage() {
    return (
        <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
            <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Dev Fixtures
                    </p>
                    <h1 className="text-3xl font-semibold">Fixture index</h1>
                    <p className="max-w-2xl text-sm leading-6 text-ui-text-secondary">
                        Browser-safe fixture pages for DOM inspection, layout debugging, and
                        Playwright runs without mounting the normal Tauri-dependent shell.
                    </p>
                </div>

                <div className="rounded-2xl border border-ui-border bg-ui-surface p-5 shadow-sm">
                    <ul className="space-y-3">
                        {FIXTURE_KEYS.map((key) => (
                            <li key={key}>
                                <a
                                    href={getDevFixtureHref(key)}
                                    className="inline-flex rounded-lg bg-ui-accent-soft px-3 py-2 text-sm font-medium text-ui-accent-on-soft transition-colors hover:bg-ui-accent-soft-hover"
                                >
                                    {key}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="text-sm text-ui-text-muted">
                    <a href="/" className="underline decoration-ui-border hover:text-ui-text">
                        Open normal app
                    </a>
                </div>
            </div>
        </div>
    );
}

function UnknownFixturePage({ fixtureKey }: { fixtureKey: string }) {
    return (
        <div className="min-h-screen bg-ui-bg px-6 py-10 text-ui-text">
            <div className="mx-auto flex w-full max-w-2xl flex-col gap-5 rounded-2xl border border-ui-border bg-ui-surface p-6 shadow-sm">
                <div className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-[0.2em] text-ui-text-muted">
                        Dev Fixtures
                    </p>
                    <h1 className="text-2xl font-semibold">Unknown fixture</h1>
                    <p className="text-sm text-ui-text-secondary">
                        No fixture is registered for <code>{fixtureKey}</code>.
                    </p>
                </div>

                <div className="flex flex-wrap gap-3">
                    <a href={getDevFixtureHref(DEV_FIXTURE_INDEX_KEY)} className="btn-ghost">
                        Back to fixtures
                    </a>
                    <a href="/" className="btn-primary">
                        Open normal app
                    </a>
                </div>
            </div>
        </div>
    );
}

function DevModeContent() {
    const fixtureKey = getDevFixtureKey(window.location.search);

    if (!fixtureKey || fixtureKey === DEV_FIXTURE_INDEX_KEY) {
        return <DevIndexPage />;
    }

    if (fixtureKey === 'workspace-shell') {
        return <WorkspaceShellFixturePage />;
    }

    if (fixtureKey === 'workspace-empty') {
        return <WorkspaceEmptyFixturePage />;
    }

    return <UnknownFixturePage fixtureKey={fixtureKey} />;
}

export function DevModePage() {
    return (
        <AppProviders>
            <DevModeContent />
        </AppProviders>
    );
}
