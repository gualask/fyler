import { AppShell } from '@/app/AppShell';
import { AppProviders } from '@/app/providers';
import { setPlatformAdapter } from '@/infra/platform';

import { browserPlatformAdapter } from './browser-platform-adapter';
import {
    DEV_FIXTURE_INDEX_KEY,
    DEV_RUNTIME_APP_KEY,
    getDevFixtureHref,
    getDevFixtureKey,
} from './dev-mode';
import { ErrorBoundaryFixturePage } from './error-boundary.fixture';
import { FeedbackOverlaysFixturePage } from './feedback-overlays.fixture';
import { FinalDocumentFixturePage } from './final-document.fixture';
import { PagePickerFixturePage } from './page-picker.fixture';
import { PreviewModalFixturePage } from './preview-modal.fixture';
import { QuickAddFixturePage } from './quick-add.fixture';
import { SupportDialogFixturePage } from './support-dialog.fixture';
import { TutorialOverlayFixturePage } from './tutorial-overlay.fixture';
import { UpdateDialogFixturePage } from './update-dialog.fixture';
import { WorkspaceEmptyFixturePage } from './workspace-empty.fixture';
import { WorkspacePreviewFixturePage } from './workspace-preview.fixture';
import { WorkspaceShellFixturePage } from './workspace-shell.fixture';

const FIXTURE_KEYS = [
    DEV_RUNTIME_APP_KEY,
    'workspace-shell',
    'workspace-preview',
    'workspace-empty',
    'preview-modal',
    'quick-add',
    'support-dialog',
    'tutorial-overlay',
    'feedback-overlays',
    'final-document',
    'page-picker',
    'update-dialog',
    'error-boundary',
] as const;

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
                        Playwright runs without depending on the native Tauri runtime. Use
                        <code className="mx-1 rounded bg-ui-accent-soft px-1.5 py-0.5 text-xs">
                            {DEV_RUNTIME_APP_KEY}
                        </code>
                        to mount the real shell on the dev adapter.
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

function BrowserRuntimeAppPage() {
    return (
        <AppProviders>
            <AppShell />
        </AppProviders>
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
    setPlatformAdapter(browserPlatformAdapter);

    if (!fixtureKey || fixtureKey === DEV_FIXTURE_INDEX_KEY) {
        return <DevIndexPage />;
    }

    if (fixtureKey === DEV_RUNTIME_APP_KEY) {
        return <BrowserRuntimeAppPage />;
    }

    if (fixtureKey === 'workspace-shell') {
        return <WorkspaceShellFixturePage />;
    }

    if (fixtureKey === 'workspace-preview') {
        return <WorkspacePreviewFixturePage />;
    }

    if (fixtureKey === 'workspace-empty') {
        return <WorkspaceEmptyFixturePage />;
    }

    if (fixtureKey === 'preview-modal') {
        return <PreviewModalFixturePage />;
    }

    if (fixtureKey === 'quick-add') {
        return <QuickAddFixturePage />;
    }

    if (fixtureKey === 'support-dialog') {
        return <SupportDialogFixturePage />;
    }

    if (fixtureKey === 'tutorial-overlay') {
        return <TutorialOverlayFixturePage />;
    }

    if (fixtureKey === 'feedback-overlays') {
        return <FeedbackOverlaysFixturePage />;
    }

    if (fixtureKey === 'final-document') {
        return <FinalDocumentFixturePage />;
    }

    if (fixtureKey === 'page-picker') {
        return <PagePickerFixturePage />;
    }

    if (fixtureKey === 'update-dialog') {
        return <UpdateDialogFixturePage />;
    }

    if (fixtureKey === 'error-boundary') {
        return <ErrorBoundaryFixturePage />;
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
